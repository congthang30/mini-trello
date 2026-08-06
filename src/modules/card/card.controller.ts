import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCardDto, MoveCardDto, UpdateCardDto } from './dto/card.dto';
import { CardService } from './card.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller()
@UseGuards(JwtAuthGuard)
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Post('lists/:listId/cards')
  createCard(
    @Param('listId') listId: string,
    @Body() dto: CreateCardDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.cardService.createCard(listId, request.user.sub, dto);
  }

  @Get('cards/:cardId')
  getCardDetail(
    @Param('cardId') cardId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.cardService.getCardDetail(cardId, request.user.sub);
  }

  @Patch('cards/:cardId')
  updateCard(
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCardDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.cardService.updateCard(cardId, request.user.sub, dto);
  }

  @Patch('cards/:cardId/move')
  moveCard(
    @Param('cardId') cardId: string,
    @Body() dto: MoveCardDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.cardService.moveCard(cardId, request.user.sub, dto);
  }

  @Delete('cards/:cardId')
  deleteCard(
    @Param('cardId') cardId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.cardService.deleteCard(cardId, request.user.sub);
  }
}
