import { Timestamp } from 'firebase-admin/firestore';

export interface CardEntity {
  id: string;
  boardId: string;
  listId: string;

  title: string;
  description?: string;

  position: number;

  createdBy: string;

  dueDate?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
