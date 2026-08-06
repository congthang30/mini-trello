import { IsEmail, IsEnum, IsString } from 'class-validator';
import { BoardMemberRole } from '../entities/board-member.entity';

export class AddUserToBoardDto {
  @IsEmail()
  email!: string;

  @IsEnum(BoardMemberRole)
  role!: BoardMemberRole;
}
