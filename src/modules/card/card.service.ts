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
import { FirebaseService } from '../firebase/firebase.service';
import { CreateCardDto, MoveCardDto, UpdateCardDto } from './dto/card.dto';
import { CardEntity } from './entities/card.entity';
import { ListEntity } from '../list/entities/list.entity';

@Injectable()
export class CardService {
  private readonly firestore: Firestore;
  private readonly cardsCollection: CollectionReference;
  private readonly listsCollection: CollectionReference;
  private readonly boardMembersCollection: CollectionReference;

  constructor(private readonly firebaseService: FirebaseService) {
    this.firestore = this.firebaseService.getDB();
    this.cardsCollection = this.firestore.collection('cards');
    this.listsCollection = this.firestore.collection('lists');
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

  private async findCardById(cardId: string): Promise<CardEntity | null> {
    const document = await this.cardsCollection.doc(cardId).get();

    if (!document.exists) {
      return null;
    }

    return {
      ...document.data(),
      id: document.id,
    } as CardEntity;
  }

  private async checkBoardAccess(
    boardId: string,
    userId: string,
  ): Promise<void> {
    const snapshot = await this.boardMembersCollection
      .where('boardId', '==', boardId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new ForbiddenException('Bạn không có quyền truy cập bảng này');
    }
  }

  async createCard(
    listId: string,
    userId: string,
    dto: CreateCardDto,
  ): Promise<{ message: string; card: CardEntity }> {
    const list = await this.findListById(listId);

    if (!list) {
      throw new NotFoundException('Không tìm thấy danh sách');
    }

    await this.checkBoardAccess(list.boardId, userId);

    const latestCardSnapshot = await this.cardsCollection
      .where('listId', '==', listId)
      .orderBy('position', 'desc')
      .limit(1)
      .get();

    let position = 1;

    if (!latestCardSnapshot.empty) {
      const latestCard = latestCardSnapshot.docs[0].data() as CardEntity;

      position = latestCard.position + 1;
    }

    const cardReference = this.cardsCollection.doc();
    const now = Timestamp.now();

    const card: CardEntity = {
      id: cardReference.id,
      boardId: list.boardId,
      listId,
      title: dto.title.trim(),
      description: dto.description?.trim() ?? '',
      position,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    if (dto.dueDate) {
      card.dueDate = Timestamp.fromDate(new Date(dto.dueDate));
    }

    await cardReference.set(card);

    return {
      message: 'Tạo thẻ thành công',
      card,
    };
  }

  async updateCard(
    cardId: string,
    userId: string,
    dto: UpdateCardDto,
  ): Promise<{ message: string; card: CardEntity }> {
    const card = await this.findCardById(cardId);

    if (!card) {
      throw new NotFoundException('Không tìm thấy thẻ');
    }

    await this.checkBoardAccess(card.boardId, userId);

    const updates: Partial<CardEntity> = {
      updatedAt: Timestamp.now(),
    };

    if (dto.title !== undefined) {
      updates.title = dto.title.trim();
    }

    if (dto.description !== undefined) {
      updates.description = dto.description.trim();
    }

    if (dto.dueDate !== undefined) {
      updates.dueDate = Timestamp.fromDate(new Date(dto.dueDate));
    }

    if (
      dto.title === undefined &&
      dto.description === undefined &&
      dto.dueDate === undefined
    ) {
      throw new BadRequestException('Không có dữ liệu cần cập nhật');
    }

    await this.cardsCollection.doc(cardId).update(updates);

    const updatedCard: CardEntity = {
      ...card,
      ...updates,
    };

    return {
      message: 'Cập nhật thẻ thành công',
      card: updatedCard,
    };
  }

  async moveCard(
    cardId: string,
    userId: string,
    dto: MoveCardDto,
  ): Promise<{ message: string; card: CardEntity }> {
    const card = await this.findCardById(cardId);

    if (!card) {
      throw new NotFoundException('Không tìm thấy thẻ');
    }

    const targetList = await this.findListById(dto.listId);

    if (!targetList) {
      throw new NotFoundException('Không tìm thấy danh sách');
    }

    if (targetList.boardId !== card.boardId) {
      throw new BadRequestException('Không thể chuyển thẻ sang bảng khác');
    }

    await this.checkBoardAccess(card.boardId, userId);

    const sourceSnapshot = await this.cardsCollection
      .where('listId', '==', card.listId)
      .orderBy('position', 'asc')
      .get();

    const sourceCards = sourceSnapshot.docs.map((document) => ({
      ...document.data(),
      id: document.id,
    })) as CardEntity[];

    const remainingSourceCards = sourceCards.filter(
      (item) => item.id !== cardId,
    );

    let targetCards: CardEntity[];

    if (card.listId === dto.listId) {
      targetCards = remainingSourceCards;
    } else {
      const targetSnapshot = await this.cardsCollection
        .where('listId', '==', dto.listId)
        .orderBy('position', 'asc')
        .get();

      targetCards = targetSnapshot.docs.map((document) => ({
        ...document.data(),
        id: document.id,
      })) as CardEntity[];
    }

    const position = Math.min(
      Math.max(dto.position, 1),
      targetCards.length + 1,
    );

    targetCards.splice(position - 1, 0, {
      ...card,
      listId: dto.listId,
      position,
    });

    const batch = this.firestore.batch();
    const now = Timestamp.now();

    if (card.listId !== dto.listId) {
      remainingSourceCards.forEach((item, index) => {
        batch.update(this.cardsCollection.doc(item.id), {
          position: index + 1,
          updatedAt: now,
        });
      });
    }

    targetCards.forEach((item, index) => {
      batch.update(this.cardsCollection.doc(item.id), {
        listId: dto.listId,
        position: index + 1,
        updatedAt: now,
      });
    });

    await batch.commit();

    return {
      message: 'Di chuyển thẻ thành công',
      card: {
        ...card,
        listId: dto.listId,
        position,
        updatedAt: now,
      },
    };
  }

  async deleteCard(
    cardId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const card = await this.findCardById(cardId);

    if (!card) {
      throw new NotFoundException('Không tìm thấy thẻ');
    }

    await this.checkBoardAccess(card.boardId, userId);

    const snapshot = await this.cardsCollection
      .where('listId', '==', card.listId)
      .orderBy('position', 'asc')
      .get();

    const remainingCards = snapshot.docs
      .filter((document) => document.id !== cardId)
      .map((document) => ({
        ...document.data(),
        id: document.id,
      })) as CardEntity[];

    const batch = this.firestore.batch();
    const now = Timestamp.now();

    batch.delete(this.cardsCollection.doc(cardId));

    remainingCards.forEach((item, index) => {
      batch.update(this.cardsCollection.doc(item.id), {
        position: index + 1,
        updatedAt: now,
      });
    });

    await batch.commit();

    return {
      message: 'Xóa thẻ thành công',
    };
  }

  async getCardDetail(cardId: string, userId: string): Promise<CardEntity> {
    const card = await this.findCardById(cardId);

    if (!card) {
      throw new NotFoundException('Không tìm thấy thẻ');
    }

    await this.checkBoardAccess(card.boardId, userId);

    return card;
  }

  async getCardsByBoard(
    boardId: string,
    userId: string,
  ): Promise<CardEntity[]> {
    await this.checkBoardAccess(boardId, userId);

    const snapshot = await this.cardsCollection
      .where('boardId', '==', boardId)
      .get();

    return snapshot.docs
      .map(
        (document) =>
          ({
            ...document.data(),
            id: document.id,
          }) as CardEntity,
      )
      .sort((a, b) => {
        if (a.listId === b.listId) {
          return a.position - b.position;
        }

        return a.listId.localeCompare(b.listId);
      });
  }
}
