import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { FirebaseModule } from './modules/firebase/firebase.module';
import { MailModule } from './modules/mail/mail.module';

import appConfig from './config/app.config';
import firebaseConfig from './config/firebase.config';
import mailConfig from './config/mail.config';


@Module({
  imports: [

    ConfigModule.forRoot({
      isGlobal: true,

      load: [
        appConfig,
        firebaseConfig,
        mailConfig,
      ],
    }),
    FirebaseModule,
    MailModule,

  ],
})
export class AppModule {}