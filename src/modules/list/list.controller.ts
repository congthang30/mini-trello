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
import {
  CreateListDto,
  UpdateListPositionDto,
  UpdateListTitleDto,
} from './dto/list.dto';
import { ListService } from './list.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller()
@UseGuards(JwtAuthGuard)
export class ListController {
  constructor(private readonly listService: ListService) {}

  @Post('boards/:boardId/lists')
  createList(
    @Param('boardId') boardId: string,
    @Body() dto: CreateListDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.listService.createList(boardId, request.user.sub, dto);
  }

  @Get('boards/:boardId/lists')
  getLists(
    @Param('boardId') boardId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.listService.getLists(boardId, request.user.sub);
  }

  @Get('lists/:listId')
  getListDetail(
    @Param('listId') listId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.listService.getListDetail(listId, request.user.sub);
  }

  @Patch('lists/:listId/title')
  updateTitle(
    @Param('listId') listId: string,
    @Body() dto: UpdateListTitleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.listService.updateTitle(listId, request.user.sub, dto);
  }

  @Patch('lists/:listId/position')
  updatePosition(
    @Param('listId') listId: string,
    @Body() dto: UpdateListPositionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.listService.updatePosition(listId, request.user.sub, dto);
  }

  @Delete('lists/:listId')
  deleteList(
    @Param('listId') listId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.listService.deleteList(listId, request.user.sub);
  }
}
