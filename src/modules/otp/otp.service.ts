import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomInt } from 'crypto';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { MailService } from '../mail/mail.service';

interface OtpDocument {
  email: string;
  otpHash: string;
  expiresAt: Timestamp;
  lastSentAt: Timestamp;
  windowStartedAt: Timestamp;
  sendCount: number;
  attempts: number;
}

@Injectable()
export class OtpService {
  private readonly firestore = getFirestore();

  constructor(
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      throw new BadRequestException('Email không hợp lệ');
    }
  }

  private getDocumentId(email: string): string {
    return createHash('sha256').update(email).digest('hex');
  }

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  private hashOtp(email: string, otp: string): string {
    const secret = this.configService.getOrThrow<string>('OTP_SECRET');

    return createHmac('sha256', secret)
      .update(`${email}:${otp}`)
      .digest('hex');
  }

  async sendOtp(rawEmail: string): Promise<{ message: string }> {
    const email = this.normalizeEmail(rawEmail);
    this.validateEmail(email);

    const documentReference = this.firestore
      .collection('email_otps')
      .doc(this.getDocumentId(email));

    const snapshot = await documentReference.get();
    const oldData = snapshot.data() as OtpDocument | undefined;

    const now = Timestamp.now();
    const nowMs = now.toMillis();
    const oneMinute = 60 * 1000;
    const oneHour = 60 * 60 * 1000;

    if (
      oldData &&
      nowMs - oldData.lastSentAt.toMillis() < oneMinute
    ) {
      throw new HttpException(
        'Vui lòng chờ 60 giây trước khi gửi lại OTP',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const isSameHour =
      oldData &&
      nowMs - oldData.windowStartedAt.toMillis() < oneHour;

    const sendCount = isSameHour ? oldData.sendCount + 1 : 1;

    if (sendCount > 5) {
      throw new HttpException(
        'Bạn đã gửi quá 5 mã OTP trong 1 giờ',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otp = this.generateOtp();
    const expiresMinutes =
      this.configService.get<number>('OTP_EXPIRES_MINUTES') ?? 5;

    const otpData: OtpDocument = {
      email,
      otpHash: this.hashOtp(email, otp),
      expiresAt: Timestamp.fromMillis(
        nowMs + expiresMinutes * 60 * 1000,
      ),
      lastSentAt: now,
      windowStartedAt: isSameHour
        ? oldData.windowStartedAt
        : now,
      sendCount,
      attempts: 0,
    };

    await documentReference.set(otpData);

    try {
      await this.mailService.sendOtp(email, otp);
    } catch {
      await documentReference.delete();

      throw new HttpException(
        'Không thể gửi email OTP',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      message: 'Mã OTP đã được gửi qua email',
    };
  }

  async verifyOtp(
    rawEmail: string,
    rawOtp: string,
  ): Promise<{ verified: boolean; message: string }> {
    const email = this.normalizeEmail(rawEmail);
    const otp = rawOtp?.trim();

    this.validateEmail(email);

    if (!/^\d{6}$/.test(otp)) {
      throw new BadRequestException('OTP phải gồm 6 chữ số');
    }

    const documentReference = this.firestore
      .collection('email_otps')
      .doc(this.getDocumentId(email));

    const snapshot = await documentReference.get();

    if (!snapshot.exists) {
      throw new BadRequestException(
        'OTP không tồn tại hoặc đã được sử dụng',
      );
    }

    const data = snapshot.data() as OtpDocument;

    if (data.expiresAt.toMillis() < Date.now()) {
      await documentReference.delete();
      throw new BadRequestException('OTP đã hết hạn');
    }

    const enteredOtpHash = this.hashOtp(email, otp);

    if (enteredOtpHash !== data.otpHash) {
      const newAttempts = data.attempts + 1;

      if (newAttempts >= 5) {
        await documentReference.delete();

        throw new HttpException(
          'Bạn đã nhập sai 5 lần. Hãy yêu cầu OTP mới',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      await documentReference.update({
        attempts: newAttempts,
      });

      throw new BadRequestException(
        `OTP không chính xác. Còn ${5 - newAttempts} lần thử`,
      );
    }

    await documentReference.delete();

    return {
      verified: true,
      message: 'Xác thực OTP thành công',
    };
  }
}