import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

@Injectable()
export class FirebaseService {
  private firestore;

  constructor(
    private readonly configService: ConfigService,
  ) {
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: this.configService.get<string>(
            'firebase.projectId',
          ),

          clientEmail: this.configService.get<string>(
            'firebase.clientEmail',
          ),

          privateKey: this.configService.get<string>(
            'firebase.privateKey',
          ),
        }),
      });
    }

    this.firestore = getFirestore();
  }

  getDB() {
    return this.firestore;
  }

  async test() {
    await this.firestore.collection('test').add({
      message: 'Kết nối firebase thành công!',
      createdAt: new Date(),
    });

    return 'OK';
  }
}