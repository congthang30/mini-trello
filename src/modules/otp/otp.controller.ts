import { Body, Controller, Post } from '@nestjs/common';
import { OtpService } from './otp.service';

@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('send')
  sendOtp(@Body('email') email: string) {
    return this.otpService.sendOtp(email);
  }

  @Post('verify')
  verifyOtp(
    @Body('email') email: string,
    @Body('otp') otp: string,
  ) {
    return this.otpService.verifyOtp(email, otp);
  }
}