import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CollectionReference,
  Firestore,
  Timestamp,
} from 'firebase-admin/firestore';
import { UserEntity } from '../auth/entities/user.entity';
import { BoardEntity } from '../board/entities/board.entity';
import {
  BoardMemberEntity,
  BoardMemberRole,
} from '../board/entities/board-member.entity';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateInvitationDto } from './dto/invitation.dto';
import {
  BoardInvitationEntity,
  BoardInvitationStatus,
} from './entities/board-invitation.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class InvitationService {
  private readonly firestore: Firestore;
  private readonly usersCollection: CollectionReference;
  private readonly boardsCollection: CollectionReference;
  private readonly membersCollection: CollectionReference;
  private readonly invitationsCollection: CollectionReference;

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly mailService: MailService,
  ) {
    this.firestore = this.firebaseService.getDB();
    this.usersCollection = this.firestore.collection('users');
    this.boardsCollection = this.firestore.collection('boards');
    this.membersCollection = this.firestore.collection('boardMembers');
    this.invitationsCollection = this.firestore.collection('boardInvitations');
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

  async createInvitation(
    boardId: string,
    inviterId: string,
    dto: CreateInvitationDto,
  ): Promise<{
    message: string;
    invitation: BoardInvitationEntity;
  }> {
    const boardDocument = await this.boardsCollection.doc(boardId).get();

    if (!boardDocument.exists) {
      throw new NotFoundException('Không tìm thấy bảng');
    }

    const board = boardDocument.data() as BoardEntity;

    if (board.ownerId !== inviterId) {
      throw new ForbiddenException('Bạn không có quyền gửi lời mời');
    }

    if (dto.role === BoardMemberRole.OWNER) {
      throw new BadRequestException('Không thể mời với quyền chủ sở hữu');
    }

    const email = dto.email.trim().toLowerCase();
    const invitee = await this.findUserByEmail(email);

    if (!invitee) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (invitee.id === inviterId) {
      throw new BadRequestException('Không thể tự mời chính mình');
    }

    const memberSnapshot = await this.membersCollection
      .where('boardId', '==', boardId)
      .where('userId', '==', invitee.id)
      .limit(1)
      .get();

    if (!memberSnapshot.empty) {
      throw new ConflictException('Người dùng đã là thành viên của bảng');
    }

    const invitationId = `${boardId}_${invitee.id}`;
    const invitationReference = this.invitationsCollection.doc(invitationId);

    const invitationDocument = await invitationReference.get();

    if (invitationDocument.exists) {
      const currentInvitation =
        invitationDocument.data() as BoardInvitationEntity;

      if (currentInvitation.status === BoardInvitationStatus.PENDING) {
        throw new ConflictException('Lời mời đang chờ phản hồi');
      }
    }

    const invitation: BoardInvitationEntity = {
      id: invitationId,
      boardId,
      inviterId,
      inviteeId: invitee.id,
      role: dto.role,
      status: BoardInvitationStatus.PENDING,
      createdAt: Timestamp.now(),
    };

    await invitationReference.set(invitation);

    await this.mailService.sendBoardInvitation(invitee.email, board.name);

    return {
      message: 'Gửi lời mời thành công',
      invitation,
    };
  }

  async getMyInvitations(userId: string, status?: BoardInvitationStatus) {
    let query = this.invitationsCollection.where('inviteeId', '==', userId);

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();

    const invitations = snapshot.docs
      .map(
        (document) =>
          ({
            ...document.data(),
            id: document.id,
          }) as BoardInvitationEntity,
      )
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

    return Promise.all(
      invitations.map(async (invitation) => {
        const [boardDocument, inviterDocument] = await Promise.all([
          this.boardsCollection.doc(invitation.boardId).get(),
          this.usersCollection.doc(invitation.inviterId).get(),
        ]);

        const board = boardDocument.data() as BoardEntity | undefined;

        const inviter = inviterDocument.data() as UserEntity | undefined;

        return {
          ...invitation,
          board: board
            ? {
                id: boardDocument.id,
                name: board.name,
              }
            : null,
          inviter: inviter
            ? {
                id: inviterDocument.id,
                name: inviter.name,
                email: inviter.email,
              }
            : null,
        };
      }),
    );
  }

  async getBoardInvitations(
    boardId: string,
    ownerId: string,
    status?: BoardInvitationStatus,
  ) {
    const boardDocument = await this.boardsCollection.doc(boardId).get();

    if (!boardDocument.exists) {
      throw new NotFoundException('Không tìm thấy bảng');
    }

    const board = boardDocument.data() as BoardEntity;

    if (board.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Bạn không có quyền xem lời mời của bảng này',
      );
    }

    let query = this.invitationsCollection.where('boardId', '==', boardId);

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();

    const invitations = snapshot.docs
      .map(
        (document) =>
          ({
            ...document.data(),
            id: document.id,
          }) as BoardInvitationEntity,
      )
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

    return Promise.all(
      invitations.map(async (invitation) => {
        const inviteeDocument = await this.usersCollection
          .doc(invitation.inviteeId)
          .get();

        const invitee = inviteeDocument.data() as UserEntity | undefined;

        return {
          ...invitation,
          invitee: invitee
            ? {
                id: inviteeDocument.id,
                name: invitee.name,
                email: invitee.email,
              }
            : null,
        };
      }),
    );
  }

  async getInvitationDetail(invitationId: string, userId: string) {
    const invitationDocument = await this.invitationsCollection
      .doc(invitationId)
      .get();

    if (!invitationDocument.exists) {
      throw new NotFoundException('Không tìm thấy lời mời');
    }

    const invitation = {
      ...invitationDocument.data(),
      id: invitationDocument.id,
    } as BoardInvitationEntity;

    if (invitation.inviterId !== userId && invitation.inviteeId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem lời mời này');
    }

    const [boardDocument, inviterDocument, inviteeDocument] = await Promise.all(
      [
        this.boardsCollection.doc(invitation.boardId).get(),
        this.usersCollection.doc(invitation.inviterId).get(),
        this.usersCollection.doc(invitation.inviteeId).get(),
      ],
    );

    const board = boardDocument.data() as BoardEntity | undefined;

    const inviter = inviterDocument.data() as UserEntity | undefined;

    const invitee = inviteeDocument.data() as UserEntity | undefined;

    return {
      ...invitation,
      board: board
        ? {
            id: boardDocument.id,
            name: board.name,
          }
        : null,
      inviter: inviter
        ? {
            id: inviterDocument.id,
            name: inviter.name,
            email: inviter.email,
          }
        : null,
      invitee: invitee
        ? {
            id: inviteeDocument.id,
            name: invitee.name,
            email: invitee.email,
          }
        : null,
    };
  }

  async acceptInvitation(
    invitationId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const invitationReference = this.invitationsCollection.doc(invitationId);

    const memberReference = this.membersCollection.doc();

    await this.firestore.runTransaction(async (transaction) => {
      const invitationDocument = await transaction.get(invitationReference);

      if (!invitationDocument.exists) {
        throw new NotFoundException('Không tìm thấy lời mời');
      }

      const invitation = invitationDocument.data() as BoardInvitationEntity;

      if (invitation.inviteeId !== userId) {
        throw new ForbiddenException('Lời mời này không thuộc về bạn');
      }

      if (invitation.status !== BoardInvitationStatus.PENDING) {
        throw new BadRequestException('Lời mời đã được xử lý');
      }

      if (invitation.role === BoardMemberRole.OWNER) {
        throw new BadRequestException('Quyền thành viên không hợp lệ');
      }

      const boardReference = this.boardsCollection.doc(invitation.boardId);

      const boardDocument = await transaction.get(boardReference);

      if (!boardDocument.exists) {
        throw new NotFoundException('Không tìm thấy bảng');
      }

      const memberQuery = this.membersCollection
        .where('boardId', '==', invitation.boardId)
        .where('userId', '==', userId)
        .limit(1);

      const memberSnapshot = await transaction.get(memberQuery);

      const now = Timestamp.now();

      transaction.update(invitationReference, {
        status: BoardInvitationStatus.ACCEPTED,
        respondedAt: now,
      });

      if (memberSnapshot.empty) {
        const member: BoardMemberEntity = {
          id: memberReference.id,
          boardId: invitation.boardId,
          userId,
          role: invitation.role,
          joinedAt: now,
        };

        transaction.set(memberReference, member);
      }
    });

    return {
      message: 'Chấp nhận lời mời thành công',
    };
  }

  async declineInvitation(
    invitationId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const invitationReference = this.invitationsCollection.doc(invitationId);

    await this.firestore.runTransaction(async (transaction) => {
      const invitationDocument = await transaction.get(invitationReference);

      if (!invitationDocument.exists) {
        throw new NotFoundException('Không tìm thấy lời mời');
      }

      const invitation = invitationDocument.data() as BoardInvitationEntity;

      if (invitation.inviteeId !== userId) {
        throw new ForbiddenException('Lời mời này không thuộc về bạn');
      }

      if (invitation.status !== BoardInvitationStatus.PENDING) {
        throw new BadRequestException('Lời mời đã được xử lý');
      }

      transaction.update(invitationReference, {
        status: BoardInvitationStatus.DECLINED,
        respondedAt: Timestamp.now(),
      });
    });

    return {
      message: 'Từ chối lời mời thành công',
    };
  }

  async cancelInvitation(
    invitationId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const invitationReference = this.invitationsCollection.doc(invitationId);

    await this.firestore.runTransaction(async (transaction) => {
      const invitationDocument = await transaction.get(invitationReference);

      if (!invitationDocument.exists) {
        throw new NotFoundException('Không tìm thấy lời mời');
      }

      const invitation = invitationDocument.data() as BoardInvitationEntity;

      const boardReference = this.boardsCollection.doc(invitation.boardId);

      const boardDocument = await transaction.get(boardReference);

      if (!boardDocument.exists) {
        throw new NotFoundException('Không tìm thấy bảng');
      }

      const board = boardDocument.data() as BoardEntity;

      if (board.ownerId !== userId) {
        throw new ForbiddenException('Bạn không có quyền hủy lời mời này');
      }

      if (invitation.status !== BoardInvitationStatus.PENDING) {
        throw new BadRequestException('Chỉ có thể hủy lời mời đang chờ');
      }

      transaction.delete(invitationReference);
    });

    return {
      message: 'Hủy lời mời thành công',
    };
  }
}
