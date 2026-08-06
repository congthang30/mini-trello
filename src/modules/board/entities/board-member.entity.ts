import { Timestamp } from 'firebase-admin/firestore';

export type BoardMemberRole = 'owner' | 'member';

export interface BoardMemberEntity {
  id: string;

  boardId: string;
  userId: string;

  role: BoardMemberRole;

  joinedAt: Timestamp;
}
