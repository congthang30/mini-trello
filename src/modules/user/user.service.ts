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
import { UserEntity } from '../auth/entities/user.entity';
import { FirebaseService } from '../firebase/firebase.service';
import { UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UserService {
  private readonly firestore: Firestore;
  private readonly usersCollection: CollectionReference;

  constructor(private readonly firebaseService: FirebaseService) {
    this.firestore = this.firebaseService.getDB();
    this.usersCollection = this.firestore.collection('users');
  }

  private async findUserById(userId: string): Promise<UserEntity | null> {
    const document = await this.usersCollection.doc(userId).get();

    if (!document.exists) {
      return null;
    }

    return {
      ...document.data(),
      id: document.id,
    } as UserEntity;
  }

  async getUser(userId: string) {
    const user = await this.findUserById(userId);

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    const user = await this.findUserById(userId);

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    if (dto.name === undefined) {
      throw new BadRequestException('Không có dữ liệu cần cập nhật');
    }

    const updates = {
      name: dto.name.trim(),
      updatedAt: Timestamp.now(),
    };

    await this.usersCollection.doc(userId).update(updates);

    return {
      message: 'Cập nhật tài khoản thành công',
      user: {
        id: user.id,
        name: updates.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: updates.updatedAt,
      },
    };
  }
}
