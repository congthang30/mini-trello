import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { randomInt } from 'crypto';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = createTransport({
      host: this.configService.get<string>('mail.host'),
      port: this.configService.get<number>('mail.port'),
      secure: this.configService.get<boolean>('mail.secure'),
      auth: {
        user: this.configService.get<string>('mail.user'),
        pass: this.configService.get<string>('mail.password'),
      },
    });
  }

  async sendMail(to: string, subject: string, html: string) {
    return this.transporter.sendMail({
      from: this.configService.get<string>('mail.from'),
      to,
      subject,
      html,
    });
  }

  async sendOtp(email: string, otp: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.get<string>('mail.from'),
      to: email,
      subject: 'Mã xác thực Mini Trello',
      html: `
      <h2>Xác thực tài khoản</h2>
      <p>Mã OTP của bạn là:</p>
      <h1 style="letter-spacing: 6px">${otp}</h1>
      <p>Mã có hiệu lực trong 5 phút.</p>
    `,
    });
  }

  async testMail(to: string) {
    return this.transporter.sendMail({
      from: this.configService.get<string>('mail.from'),
      to,
      subject: 'Test gửi mail',
      html: `
      <h2>Gửi mail thành công!</h2>
    `,
    });
  }

  async sendBoardInvitation(email: string, boardName: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.get<string>('mail.from'),
      to: email,
      subject: `Lời mời tham gia bảng ${boardName}`,
      html: `
      <h2>Bạn được mời tham gia bảng</h2>
      <p>Bảng: <strong>${boardName}</strong></p>
      <p>Đăng nhập Mini Trello để chấp nhận hoặc từ chối lời mời.</p>
      <a href="http://localhost:5173/invitations">
        Xem lời mời
      </a>
    `,
    });
  }
}
