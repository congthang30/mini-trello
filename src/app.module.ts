import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { FirebaseModule } from './modules/firebase/firebase.module';
import { MailModule } from './modules/mail/mail.module';

import appConfig from './config/app.config';
import firebaseConfig from './config/firebase.config';
import mailConfig from './config/mail.config';
import { OtpModule } from './modules/otp/otp.module';
import jwtConfig from './config/jwt.config';
import { AuthModule } from './modules/auth/auth.module';
import { BoardModule } from './modules/board/board.module';
import { ListModule } from './modules/list/list.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,

      load: [appConfig, firebaseConfig, mailConfig, jwtConfig],
    }),
    FirebaseModule,
    MailModule,
    OtpModule,
    AuthModule,
    BoardModule,
    ListModule,
  ],
})
export class AppModule {}
