import { Timestamp } from 'firebase-admin/firestore';

export enum CardPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface CardEntity {
  id: string;
  boardId: string;
  listId: string;
  title: string;
  description?: string;
  position: number;
  priority: CardPriority;
  createdBy: string;
  dueDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
