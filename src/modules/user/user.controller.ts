import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/user.dto';
import { UserService } from './user.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  getUser(@Req() request: AuthenticatedRequest) {
    return this.userService.getUser(request.user.sub);
  }

  @Patch('me')
  updateUser(@Body() dto: UpdateUserDto, @Req() request: AuthenticatedRequest) {
    return this.userService.updateUser(request.user.sub, dto);
  }
}
