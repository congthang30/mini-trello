import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { FirebaseModule } from './modules/firebase/firebase.module';
import { MailModule } from './modules/mail/mail.module';

import appConfig from './config/app.config';
import firebaseConfig from './config/firebase.config';
import mailConfig from './config/mail.config';
import { OtpModule } from './modules/otp/otp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,

      load: [appConfig, firebaseConfig, mailConfig],
    }),
    FirebaseModule,
    MailModule,
    OtpModule,
  ],
})
export class AppModule {}
