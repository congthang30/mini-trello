import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
  Get,
  Patch,
  Delete,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateInvitationDto } from './dto/invitation.dto';
import { InvitationService } from './invitation.service';
import { Query } from '@nestjs/common';
import { GetInvitationsQueryDto } from './dto/invitation.dto';
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
  constructor(private readonly invitationService: InvitationService) {}

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
  @Get('invitations')
  getMyInvitations(
    @Query() query: GetInvitationsQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.invitationService.getMyInvitations(
      request.user.sub,
      query.status,
    );
  }
  @Get('boards/:boardId/invitations')
  getBoardInvitations(
    @Param('boardId') boardId: string,
    @Query() query: GetInvitationsQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.invitationService.getBoardInvitations(
      boardId,
      request.user.sub,
      query.status,
    );
  }

  @Get('invitations/:invitationId')
  getInvitationDetail(
    @Param('invitationId') invitationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.invitationService.getInvitationDetail(
      invitationId,
      request.user.sub,
    );
  }

  @Patch('invitations/:invitationId/accept')
  acceptInvitation(
    @Param('invitationId') invitationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.invitationService.acceptInvitation(
      invitationId,
      request.user.sub,
    );
  }

  @Patch('invitations/:invitationId/decline')
  declineInvitation(
    @Param('invitationId') invitationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.invitationService.declineInvitation(
      invitationId,
      request.user.sub,
    );
  }

  @Delete('invitations/:invitationId')
  cancelInvitation(
    @Param('invitationId') invitationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.invitationService.cancelInvitation(
      invitationId,
      request.user.sub,
    );
  }
}
