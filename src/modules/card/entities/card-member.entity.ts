import { Timestamp } from 'firebase-admin/firestore';

export interface CardMemberEntity {
  id: string;

  cardId: string;
  userId: string;

  assignedAt: Timestamp;
}
