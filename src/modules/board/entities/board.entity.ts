export interface BoardEntity {
  id: string;
  name: string;
  description?: string;
  ownerId: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
