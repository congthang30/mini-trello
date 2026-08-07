import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CollectionReference,
  Firestore,
  Timestamp,
} from 'firebase-admin/firestore';
import { BoardEntity } from './entities/board.entity';
import { BoardDto, UpdateBoardDto } from './dto/board.dto';
import { FirebaseService } from '../firebase/firebase.service';
import {
  BoardMemberEntity,
  BoardMemberRole,
} from './entities/board-member.entity';
import { AddUserToBoardDto } from './dto/board-member.dto';
import { UserEntity } from '../auth/entities/user.entity';

@Injectable()
export class BoardService {
  private readonly firestore: Firestore;
  private readonly boardsCollection: CollectionReference;
  private readonly boardMembersCollection: CollectionReference;
  private readonly usersCollection: CollectionReference;

  constructor(private readonly firebaseService: FirebaseService) {
    this.firestore = this.firebaseService.getDB();
    this.boardsCollection = this.firestore.collection('boards');
    this.boardMembersCollection = this.firestore.collection('boardMembers');
    this.usersCollection = this.firestore.collection('users');
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

  private async findBoardMember(
    boardId: string,
    userId: string,
  ): Promise<BoardMemberEntity | null> {
    const snapshot = await this.boardMembersCollection
      .where('boardId', '==', boardId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as BoardMemberEntity;
  }

  async createBoard(
    dto: BoardDto,
    ownerId: string,
  ): Promise<{ message: string; board: BoardEntity }> {
    const boardReference = this.boardsCollection.doc();
    const memberReference = this.boardMembersCollection.doc();

    const now = Timestamp.now();

    const board: BoardEntity = {
      id: boardReference.id,
      name: dto.name,
      description: dto.description ?? '',
      ownerId,
      createdAt: now,
      updatedAt: now,
    };

    const ownerMember: BoardMemberEntity = {
      id: memberReference.id,
      boardId: boardReference.id,
      userId: ownerId,
      role: BoardMemberRole.OWNER,
      joinedAt: now,
    };

    await this.firestore.runTransaction(async (transaction) => {
      transaction.set(boardReference, board);
      transaction.set(memberReference, ownerMember);
    });

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

    const membersSnapshot = await this.boardMembersCollection
      .where('boardId', '==', boardId)
      .get();

    await this.firestore.runTransaction(async (transaction) => {
      transaction.delete(this.boardsCollection.doc(boardId));
      membersSnapshot.docs.forEach((member) => {
        transaction.delete(member.ref);
      });
    });

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

  async getBoardDetail(boardId: string, userId: string): Promise<BoardEntity> {
    const board = await this.findBoardById(boardId);

    if (!board) {
      throw new NotFoundException('Không tìm thấy bảng');
    }

    const member = await this.findBoardMember(boardId, userId);

    if (!member) {
      throw new ForbiddenException('Bạn không có quyền xem bảng này');
    }

    return board;
  }

  private async findUserByEmail(email: string): Promise<UserEntity | null> {
    const snapshot = await this.usersCollection
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as UserEntity;
  }
  async addUserToBoard(
    boardId: string,
    ownerId: string,
    dto: AddUserToBoardDto,
  ): Promise<{ message: string; member: BoardMemberEntity }> {
    const board = await this.findBoardById(boardId);

    if (!board) {
      throw new NotFoundException('Không tìm thấy bảng');
    }

    if (board.ownerId !== ownerId) {
      throw new ForbiddenException('Bạn không có quyền thêm thành viên');
    }

    const user = await this.findUserByEmail(dto.email);

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const existingMember = await this.findBoardMember(boardId, user.id);

    if (existingMember) {
      throw new BadRequestException('Người dùng đã có trong bảng');
    }

    const memberReference = this.boardMembersCollection.doc();
    const now = Timestamp.now();

    const member: BoardMemberEntity = {
      id: memberReference.id,
      boardId,
      userId: user.id,
      role: dto.role,
      joinedAt: now,
    };

    await memberReference.set(member);

    return {
      message: 'Thêm thành viên thành công',
      member,
    };
  }

  async removeUserFromBoard(
    boardId: string,
    ownerId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const board = await this.findBoardById(boardId);

    if (!board) {
      throw new NotFoundException('Không tìm thấy bảng');
    }

    if (board.ownerId !== ownerId) {
      throw new ForbiddenException('Bạn không có quyền xóa thành viên');
    }

    const member = await this.findBoardMember(boardId, userId);

    if (!member) {
      throw new NotFoundException('Không tìm thấy thành viên trong bảng');
    }

    if (member.role === BoardMemberRole.OWNER) {
      throw new BadRequestException('Không thể xóa chủ sở hữu bảng');
    }

    await this.boardMembersCollection.doc(member.id).delete();

    return {
      message: 'Xóa thành viên thành công',
    };
  }

  async updateMemberRole(
    boardId: string,
    ownerId: string,
    userId: string,
    role: BoardMemberRole,
  ): Promise<{ message: string; member: BoardMemberEntity }> {
    const board = await this.findBoardById(boardId);

    if (!board) {
      throw new NotFoundException('Không tìm thấy bảng');
    }

    if (board.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Bạn không có quyền cập nhật quyền thành viên',
      );
    }
    if (role === BoardMemberRole.OWNER) {
      throw new BadRequestException('Không thể cấp quyền chủ sở hữu');
    }

    const member = await this.findBoardMember(boardId, userId);

    if (!member) {
      throw new NotFoundException('Không tìm thấy thành viên trong bảng');
    }

    if (member.role === BoardMemberRole.OWNER) {
      throw new BadRequestException('Không thể thay đổi quyền của chủ sở hữu');
    }

    const updatedMember: Partial<BoardMemberEntity> = {
      role,
    };

    await this.boardMembersCollection.doc(member.id).update(updatedMember);

    return {
      message: 'Cập nhật quyền thành viên thành công',
      member: {
        ...member,
        ...updatedMember,
      },
    };
  }

  async getBoards(userId: string): Promise<BoardEntity[]> {
  const memberSnapshot = await this.boardMembersCollection
    .where('userId', '==', userId)
    .get();

  if (memberSnapshot.empty) {
    return [];
  }

  const boardIds = memberSnapshot.docs.map(
    (document) =>
      (document.data() as BoardMemberEntity).boardId,
  );

  const boardDocuments = await Promise.all(
    boardIds.map((boardId) =>
      this.boardsCollection.doc(boardId).get(),
    ),
  );

  return boardDocuments
    .filter((document) => document.exists)
    .map((document) => ({
      ...document.data(),
      id: document.id,
    })) as BoardEntity[];
}
}
