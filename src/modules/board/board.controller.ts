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
import { BoardService } from './board.service';
import { BoardDto, UpdateBoardDto } from './dto/board.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddUserToBoardDto } from './dto/board-member.dto';
import { BoardMemberRole } from './entities/board-member.entity';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller('boards')
@UseGuards(JwtAuthGuard)
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Post()
  createBoard(@Body() dto: BoardDto, @Req() request: AuthenticatedRequest) {
    return this.boardService.createBoard(dto, request.user.sub);
  }

  @Patch(':boardId')
  updateBoard(
    @Param('boardId') boardId: string,
    @Body() dto: UpdateBoardDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.boardService.updateBoard(boardId, request.user.sub, dto);
  }

  @Delete(':boardId')
  deleteBoard(
    @Param('boardId') boardId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.boardService.deleteBoard(boardId, request.user.sub);
  }

  @Get(':boardId')
  getBoardDetail(
    @Param('boardId') boardId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.boardService.getBoardDetail(boardId, request.user.sub);
  }

  @Post(':boardId/members')
  addUserToBoard(
    @Param('boardId') boardId: string,
    @Req() req,
    @Body() dto: AddUserToBoardDto,
  ) {
    return this.boardService.addUserToBoard(boardId, req.user.sub, dto);
  }

  @Delete(':boardId/members/:userId')
  removeUserFromBoard(
    @Param('boardId') boardId: string,
    @Param('userId') userId: string,
    @Req() req,
  ) {
    return this.boardService.removeUserFromBoard(boardId, req.user.sub, userId);
  }

  @Patch(':boardId/members/:userId/role')
  updateMemberRole(
    @Param('boardId') boardId: string,
    @Param('userId') userId: string,
    @Body('role') role: BoardMemberRole,
    @Req() req,
  ) {
    return this.boardService.updateMemberRole(
      boardId,
      req.user.sub,
      userId,
      role,
    );
  }
}
