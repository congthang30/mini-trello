import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './modules/firebase/firebase.module';
import appConfig from './config/app.config';
import firebaseConfig from './config/firebase.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, firebaseConfig],
    }),
    FirebaseModule,
  ],
})
export class AppModule {}