import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { Idempotent } from '@nestjs/idempotency';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import {
  type AttendDto,
  attendSchema,
  type SubQuestContentDto,
  subQuestContentSchema,
} from './dto/quest-requests.dto.js';
import { QuestDto, SubQuestDto } from './dto/quest.dto.js';
import { QuestsService } from './quests.service.js';

@Controller('quests')
export class QuestsController {
  constructor(private readonly quests: QuestsService) {}

  // A repeat gives the same Quest, so it takes no Idempotency-Key.
  @Post()
  attend(@CurrentUser() user: SignedInUser, @Body({ schema: attendSchema }) body: AttendDto): Promise<QuestDto> {
    return this.quests.attend(user.id, body.globalEventId);
  }

  @Get()
  list(@CurrentUser() user: SignedInUser): Promise<QuestDto[]> {
    return this.quests.list(user.id);
  }

  @Get(':questId')
  read(@CurrentUser() user: SignedInUser, @Param('questId', { schema: z.uuid() }) questId: string): Promise<QuestDto> {
    return this.quests.read(user.id, questId);
  }

  @Delete(':questId')
  @HttpCode(HttpStatus.NO_CONTENT)
  drop(@CurrentUser() user: SignedInUser, @Param('questId', { schema: z.uuid() }) questId: string): Promise<void> {
    return this.quests.drop(user.id, questId);
  }

  @Post(':questId/sub-quests')
  @Idempotent({ required: true })
  addSubQuest(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
    @Body({ schema: subQuestContentSchema }) content: SubQuestContentDto,
  ): Promise<SubQuestDto> {
    return this.quests.addSubQuest(user.id, questId, content);
  }

  @Put(':questId/sub-quests/:subQuestId')
  editSubQuest(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
    @Param('subQuestId', { schema: z.uuid() }) subQuestId: string,
    @Body({ schema: subQuestContentSchema }) content: SubQuestContentDto,
  ): Promise<SubQuestDto> {
    return this.quests.editSubQuest(user.id, questId, subQuestId, content);
  }

  @Delete(':questId/sub-quests/:subQuestId')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelSubQuest(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
    @Param('subQuestId', { schema: z.uuid() }) subQuestId: string,
  ): Promise<void> {
    return this.quests.cancelSubQuest(user.id, questId, subQuestId);
  }

  @Post(':questId/sub-quests/:subQuestId/done')
  @HttpCode(HttpStatus.NO_CONTENT)
  markDone(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
    @Param('subQuestId', { schema: z.uuid() }) subQuestId: string,
  ): Promise<void> {
    return this.quests.markDone(user.id, questId, subQuestId);
  }
}
