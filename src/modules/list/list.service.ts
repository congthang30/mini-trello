import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CollectionReference,
  Firestore,
  Timestamp,
} from 'firebase-admin/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import { ListEntity } from './entities/list.entity';
import {
  CreateListDto,
  UpdateListPositionDto,
  UpdateListTitleDto,
} from './dto/list.dto';

@Injectable()
export class ListService {
  private readonly firestore: Firestore;
  private readonly listsCollection: CollectionReference;
  private readonly boardsCollection: CollectionReference;
  private readonly boardMembersCollection: CollectionReference;

  constructor(private readonly firebaseService: FirebaseService) {
    this.firestore = this.firebaseService.getDB();
    this.listsCollection = this.firestore.collection('lists');
    this.boardsCollection = this.firestore.collection('boards');
    this.boardMembersCollection = this.firestore.collection('boardMembers');
  }

  private async findListById(listId: string): Promise<ListEntity | null> {
    const document = await this.listsCollection.doc(listId).get();

    if (!document.exists) {
      return null;
    }

    return {
      ...document.data(),
      id: document.id,
    } as ListEntity;
  }

  private async checkBoardAccess(
    boardId: string,
    userId: string,
  ): Promise<void> {
    const boardDocument = await this.boardsCollection.doc(boardId).get();

    if (!boardDocument.exists) {
      throw new NotFoundException('Không tìm thấy bảng');
    }

    const memberSnapshot = await this.boardMembersCollection
      .where('boardId', '==', boardId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (memberSnapshot.empty) {
      throw new ForbiddenException('Bạn không có quyền truy cập bảng này');
    }
  }

  async createList(
    boardId: string,
    userId: string,
    dto: CreateListDto,
  ): Promise<{ message: string; list: ListEntity }> {
    await this.checkBoardAccess(boardId, userId);

    const latestListSnapshot = await this.listsCollection
      .where('boardId', '==', boardId)
      .orderBy('position', 'desc')
      .limit(1)
      .get();

    let position = 1;

    if (!latestListSnapshot.empty) {
      const latestList = latestListSnapshot.docs[0].data() as ListEntity;

      position = latestList.position + 1;
    }

    const listReference = this.listsCollection.doc();
    const now = Timestamp.now();

    const list: ListEntity = {
      id: listReference.id,
      boardId,
      title: dto.title.trim(),
      position,
      createdAt: now,
      updatedAt: now,
    };

    await listReference.set(list);

    return {
      message: 'Tạo danh sách thành công',
      list,
    };
  }

  async getLists(boardId: string, userId: string): Promise<ListEntity[]> {
    await this.checkBoardAccess(boardId, userId);

    const snapshot = await this.listsCollection
      .where('boardId', '==', boardId)
      .orderBy('position', 'asc')
      .get();

    return snapshot.docs.map((document) => ({
      ...document.data(),
      id: document.id,
    })) as ListEntity[];
  }

  async getListDetail(listId: string, userId: string): Promise<ListEntity> {
    const list = await this.findListById(listId);

    if (!list) {
      throw new NotFoundException('Không tìm thấy danh sách');
    }

    await this.checkBoardAccess(list.boardId, userId);

    return list;
  }

  async updateTitle(
    listId: string,
    userId: string,
    dto: UpdateListTitleDto,
  ): Promise<{ message: string; list: ListEntity }> {
    const list = await this.findListById(listId);

    if (!list) {
      throw new NotFoundException('Không tìm thấy danh sách');
    }

    await this.checkBoardAccess(list.boardId, userId);

    const updatedList: ListEntity = {
      ...list,
      title: dto.title.trim(),
      updatedAt: Timestamp.now(),
    };

    await this.listsCollection.doc(listId).update({
      title: updatedList.title,
      updatedAt: updatedList.updatedAt,
    });

    return {
      message: 'Cập nhật tên danh sách thành công',
      list: updatedList,
    };
  }

  async updatePosition(
    listId: string,
    userId: string,
    dto: UpdateListPositionDto,
  ): Promise<{ message: string; list: ListEntity }> {
    const list = await this.findListById(listId);

    if (!list) {
      throw new NotFoundException('Không tìm thấy danh sách');
    }

    await this.checkBoardAccess(list.boardId, userId);

    const updatedList: ListEntity = {
      ...list,
      position: dto.position,
      updatedAt: Timestamp.now(),
    };

    await this.listsCollection.doc(listId).update({
      position: updatedList.position,
      updatedAt: updatedList.updatedAt,
    });

    return {
      message: 'Cập nhật vị trí danh sách thành công',
      list: updatedList,
    };
  }

  async deleteList(
    listId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const list = await this.findListById(listId);

    if (!list) {
      throw new NotFoundException('Không tìm thấy danh sách');
    }

    await this.checkBoardAccess(list.boardId, userId);

    await this.listsCollection.doc(listId).delete();

    return {
      message: 'Xóa danh sách thành công',
    };
  }
}
