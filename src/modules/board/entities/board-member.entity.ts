import { Timestamp } from 'firebase-admin/firestore';

export enum BoardMemberRole {
  OWNER = 'owner',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export interface BoardMemberEntity {
  id: string;

  boardId: string;
  userId: string;

  role: BoardMemberRole;

  joinedAt: Timestamp;
}
