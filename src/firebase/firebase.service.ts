import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

@Injectable()
export class FirebaseService {
    private firestore: Firestore;

    constructor(
        private configService: ConfigService,
    ) {

        if (!getApps().length) {
            initializeApp({
                credential: cert({
                    projectId: this.configService.get<string>(
                        'FIREBASE_PROJECT_ID'
                    ),

                    clientEmail: this.configService.get<string>(
                        'FIREBASE_CLIENT_EMAIL'
                    ),

                    privateKey: this.configService
                        .get<string>('FIREBASE_PRIVATE_KEY')
                        ?.replace(/\\n/g, '\n'),
                }),
            });
        }

        this.firestore = getFirestore();
    }


    getDB() {
        return this.firestore;
    }


    async test() {

        await this.firestore
            .collection('test')
            .add({
                message: 'Kết nối firebase thành công!',
                createdAt: new Date(),
            });

        return 'OK';
    }
}