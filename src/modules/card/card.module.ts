import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { CardController } from './card.controller';
import { CardService } from './card.service';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [CardController],
  providers: [CardService],
  exports: [CardService],
})
export class CardModule {}
