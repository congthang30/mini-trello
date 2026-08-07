import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginWithOtpDto, RegisterDto, SendLoginOtpDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('signin/otp/send')
  sendLoginOtp(@Body() dto: SendLoginOtpDto) {
    return this.authService.sendLoginOtp(dto.email);
  }

  @Post('signin')
  loginWithOtp(@Body() dto: LoginWithOtpDto) {
    return this.authService.loginWithOtp(dto);
  }
}
