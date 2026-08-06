import { Timestamp } from 'firebase-admin/firestore';

export type UserRole = 'user';

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
