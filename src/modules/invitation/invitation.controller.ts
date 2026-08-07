import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateInvitationDto } from './dto/invitation.dto';
import { InvitationService } from './invitation.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller()
@UseGuards(JwtAuthGuard)
export class InvitationController {
  constructor(
    private readonly invitationService: InvitationService,
  ) {}

  @Post('boards/:boardId/invitations')
  createInvitation(
    @Param('boardId') boardId: string,
    @Body() dto: CreateInvitationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.invitationService.createInvitation(
      boardId,
      request.user.sub,
      dto,
    );
  }
}