// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-06 to 2026-10-09, prompted by fyoon46 and Jaehyun0320, reviewed by TaeHyun79 and fyoon46 in #41 #74
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Idempotent } from '@nestjs/idempotency';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { QuestBoard } from '../generated/prisma/client.js';
import {
  type AttendDto,
  attendSchema,
  type MakeQuestDto,
  makeQuestSchema,
  type SubQuestContentDto,
  subQuestContentSchema,
  type UpdateQuestDto,
  updateQuestSchema,
  type UserIdDto,
  userIdSchema,
} from './dto/quest-requests.dto.js';
import { QuestDto, RecruitingQuestDto, SubQuestDto } from './dto/quest.dto.js';
import { LeaderService } from './leader.service.js';
import { QuestsService } from './quests.service.js';
import { RecruitingService } from './recruiting.service.js';
import { SubQuestsService } from './sub-quests.service.js';

@Controller('quests')
export class QuestsController {
  constructor(
    private readonly quests: QuestsService,
    private readonly subQuests: SubQuestsService,
    private readonly recruiting: RecruitingService,
    private readonly leader: LeaderService,
  ) {}

  // A repeat gives the same Quest, so it takes no Idempotency-Key.
  @Post()
  attend(@CurrentUser() user: SignedInUser, @Body({ schema: attendSchema }) body: AttendDto): Promise<QuestDto> {
    return this.quests.attend(user.id, body.globalEventId, body.title);
  }

  // A route of its own, since only making a Quest needs a key.
  @Post('own')
  @Idempotent({ required: true })
  make(@CurrentUser() user: SignedInUser, @Body({ schema: makeQuestSchema }) body: MakeQuestDto): Promise<QuestDto> {
    return this.quests.make(user.id, body);
  }

  @Get()
  list(@CurrentUser() user: SignedInUser): Promise<QuestDto[]> {
    return this.quests.list(user.id);
  }

  @Get('recruiting')
  listRecruiting(
    @CurrentUser() user: SignedInUser,
    @Query('globalEventId', { schema: z.uuid().optional() }) globalEventId: string | undefined,
    @Query('board', { schema: z.enum(QuestBoard).optional() }) board: QuestBoard | undefined,
  ): Promise<RecruitingQuestDto[]> {
    return this.recruiting.list(user.id, globalEventId, board);
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

  @Patch(':questId')
  update(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
    @Body({ schema: updateQuestSchema }) changes: UpdateQuestDto,
  ): Promise<QuestDto> {
    return this.leader.update(user.id, questId, changes);
  }

  // A repeat is refused, as the Quest is gone, so it takes no Idempotency-Key.
  @Post(':questId/end')
  @HttpCode(HttpStatus.NO_CONTENT)
  end(@CurrentUser() user: SignedInUser, @Param('questId', { schema: z.uuid() }) questId: string): Promise<void> {
    return this.leader.end(user.id, questId);
  }

  @Put(':questId/leader')
  @HttpCode(HttpStatus.NO_CONTENT)
  handOver(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
    @Body({ schema: userIdSchema }) body: UserIdDto,
  ): Promise<void> {
    return this.leader.handOver(user.id, questId, body.userId);
  }

  @Delete(':questId/holders/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeHolder(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
    @Param('userId', { schema: z.uuid() }) holderId: string,
  ): Promise<void> {
    return this.leader.remove(user.id, questId, holderId);
  }

  // A repeat is refused as a Holder already, so it takes no Idempotency-Key.
  @Post(':questId/join')
  join(@CurrentUser() user: SignedInUser, @Param('questId', { schema: z.uuid() }) questId: string): Promise<QuestDto> {
    return this.recruiting.join(user.id, questId);
  }

  @Post(':questId/sub-quests')
  @Idempotent({ required: true })
  addSubQuest(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
    @Body({ schema: subQuestContentSchema }) content: SubQuestContentDto,
  ): Promise<SubQuestDto> {
    return this.subQuests.add(user.id, questId, content);
  }

  @Put(':questId/sub-quests/:subQuestId')
  editSubQuest(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
    @Param('subQuestId', { schema: z.uuid() }) subQuestId: string,
    @Body({ schema: subQuestContentSchema }) content: SubQuestContentDto,
  ): Promise<SubQuestDto> {
    return this.subQuests.edit(user.id, questId, subQuestId, content);
  }

  @Delete(':questId/sub-quests/:subQuestId')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelSubQuest(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
    @Param('subQuestId', { schema: z.uuid() }) subQuestId: string,
  ): Promise<void> {
    return this.subQuests.cancel(user.id, questId, subQuestId);
  }

  @Post(':questId/sub-quests/:subQuestId/done')
  @HttpCode(HttpStatus.NO_CONTENT)
  markDone(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
    @Param('subQuestId', { schema: z.uuid() }) subQuestId: string,
  ): Promise<void> {
    return this.subQuests.markDone(user.id, questId, subQuestId);
  }

  @Delete(':questId/sub-quests/:subQuestId/done')
  @HttpCode(HttpStatus.NO_CONTENT)
  unmarkDone(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
    @Param('subQuestId', { schema: z.uuid() }) subQuestId: string,
  ): Promise<void> {
    return this.subQuests.unmarkDone(user.id, questId, subQuestId);
  }
}
