import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CollectionReference,
  Firestore,
  getFirestore,
  Timestamp,
} from 'firebase-admin/firestore';
import { BoardEntity } from './entities/board.entity';
import { BoardDto, UpdateBoardDto } from './dto/board.dto';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class BoardService {
  private readonly firestore: Firestore;
  private readonly boardsCollection: CollectionReference;

  constructor(private readonly firebaseService: FirebaseService) {
    this.firestore = this.firebaseService.getDB();
    this.boardsCollection = this.firestore.collection('boards');
  }

  private async findBoardsByOwnerId(ownerId: string): Promise<BoardEntity[]> {
    const snapshot = await this.boardsCollection
      .where('ownerId', '==', ownerId)
      .get();

    return snapshot.docs.map((document) => document.data() as BoardEntity);
  }

  private async findBoardById(boardId: string): Promise<BoardEntity | null> {
    const document = await this.boardsCollection.doc(boardId).get();

    if (!document.exists) {
      return null;
    }

    return document.data() as BoardEntity;
  }

  async createBoard(
    dto: BoardDto,
    ownerId: string,
  ): Promise<{ message: string; board: BoardEntity }> {
    const boardReference = this.boardsCollection.doc();
    const now = Timestamp.now();

    const board: BoardEntity = {
      id: boardReference.id,
      name: dto.name,
      description: dto.description ?? '',
      ownerId,
      createdAt: now,
      updatedAt: now,
    };

    await boardReference.set(board);

    return {
      message: 'Tạo bảng thành công',
      board,
    };
  }

  async deleteBoard(
    boardId: string,
    ownerId: string,
  ): Promise<{ message: string }> {
    const board = await this.findBoardById(boardId);

    if (!board) {
      throw new NotFoundException('Không tìm thấy bảng');
    }

    if (board.ownerId !== ownerId) {
      throw new ForbiddenException('Bạn không có quyền xóa bảng này');
    }

    await this.boardsCollection.doc(boardId).delete();

    return {
      message: 'Xóa bảng thành công',
    };
  }

  async updateBoard(
    boardId: string,
    ownerId: string,
    dto: UpdateBoardDto,
  ): Promise<{ message: string; board: BoardEntity }> {
    const board = await this.findBoardById(boardId);

    if (!board) {
      throw new NotFoundException('Không tìm thấy bảng');
    }

    if (board.ownerId !== ownerId) {
      throw new ForbiddenException('Bạn không có quyền cập nhật bảng này');
    }

    const updates: Partial<BoardEntity> = {
      updatedAt: Timestamp.now(),
    };

    if (dto.name !== undefined) {
      updates.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      updates.description = dto.description.trim();
    }

    if (dto.name === undefined && dto.description === undefined) {
      throw new BadRequestException('Không có dữ liệu cần cập nhật');
    }

    await this.boardsCollection.doc(boardId).update(updates);

    const updatedBoard: BoardEntity = {
      ...board,
      ...updates,
    };

    return {
      message: 'Cập nhật bảng thành công',
      board: updatedBoard,
    };
  }

  async getBoardDetail(boardId: string, ownerId: string): Promise<BoardEntity> {
    const board = await this.findBoardById(boardId);

    if (!board) {
      throw new NotFoundException('Không tìm thấy bảng');
    }

    if (board.ownerId !== ownerId) {
      throw new ForbiddenException('Bạn không có quyền xem bảng này');
    }

    return board;
  }
}
