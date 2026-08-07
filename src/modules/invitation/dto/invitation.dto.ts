import { IsEmail, IsEnum } from 'class-validator';
import { BoardMemberRole } from '../../board/entities/board-member.entity';

export class CreateInvitationDto {
  @IsEmail()
  email!: string;

  @IsEnum(BoardMemberRole)
  role!: BoardMemberRole;
}