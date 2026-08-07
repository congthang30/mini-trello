import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(2, 50)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  otp!: string;
}

export class SendLoginOtpDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;
}

export class LoginWithOtpDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'OTP phải gồm 6 chữ số',
  })
  otp!: string;
}
