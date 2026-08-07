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
}
