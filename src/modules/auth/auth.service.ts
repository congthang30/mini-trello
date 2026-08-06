import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { OtpService } from '../otp/otp.service';
import { UserEntity } from './entities/user.entity';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly firestore = getFirestore();
  private readonly usersCollection = this.firestore.collection('users');

  constructor(
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async findUserByEmail(email: string): Promise<UserEntity | null> {
    const snapshot = await this.usersCollection
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as UserEntity;
  }

  private createAccessToken(user: UserEntity): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  async register(dto: RegisterDto) {
    const email = this.normalizeEmail(dto.email);
    const name = dto.name.trim();

    const existingUser = await this.findUserByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email đã được đăng ký');
    }

    await this.otpService.verifyOtp(email, dto.otp);

    const passwordHash = await hash(dto.password, 12);
    const userReference = this.usersCollection.doc();
    const now = Timestamp.now();

    const user: UserEntity = {
      id: userReference.id,
      name,
      email,
      passwordHash,
      role: 'user',
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await userReference.set(user);
    } catch {
      throw new BadRequestException('Không thể tạo tài khoản');
    }

    const accessToken = this.createAccessToken(user);

    return {
      message: 'Đăng ký tài khoản thành công',
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(dto: LoginDto) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.findUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const passwordIsCorrect = await compare(dto.password, user.passwordHash);

    if (!passwordIsCorrect) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const accessToken = this.createAccessToken(user);

    return {
      message: 'Đăng nhập thành công',
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
