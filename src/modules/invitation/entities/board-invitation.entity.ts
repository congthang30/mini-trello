import { Timestamp } from 'firebase-admin/firestore';
import { BoardMemberRole } from '../../board/entities/board-member.entity';

export enum BoardInvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

export interface BoardInvitationEntity {
  id: string;
  boardId: string;
  inviterId: string;
  inviteeId: string;
  role: BoardMemberRole;
  status: BoardInvitationStatus;
  createdAt: Timestamp;
  respondedAt?: Timestamp;
}
