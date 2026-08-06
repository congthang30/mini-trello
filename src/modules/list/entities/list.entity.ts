import { Timestamp } from 'firebase-admin/firestore';

export interface ListEntity {
  id: string;
  boardId: string;

  title: string;
  position: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
