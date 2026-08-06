import { IsEnum, IsString } from 'class-validator';
import { BoardMemberRole } from '../entities/board-member.entity';

export class AddUserToBoardDto {
  @IsString()
  userId!: string;

  @IsEnum(['member', 'viewer'])
  role!: BoardMemberRole;
}
