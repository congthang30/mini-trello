import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { BoardMemberRole } from '../../board/entities/board-member.entity';
import { BoardInvitationStatus } from '../entities/board-invitation.entity';

export class CreateInvitationDto {
  @IsEmail()
  email!: string;

  @IsEnum(BoardMemberRole)
  role!: BoardMemberRole;
}

export class GetInvitationsQueryDto {
  @IsOptional()
  @IsEnum(BoardInvitationStatus)
  status?: BoardInvitationStatus;
}