import { Timestamp } from 'firebase-admin/firestore';

export interface BoardEntity {
  id: string;
  name: string;
  description?: string;
  ownerId: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
