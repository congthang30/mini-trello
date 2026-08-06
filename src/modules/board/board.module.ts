import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [AuthModule, FirebaseModule],
  controllers: [BoardController],
  providers: [BoardService],
})
export class BoardModule {}
