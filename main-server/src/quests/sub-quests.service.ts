/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Inject, Injectable, Logger } from '@nestjs/common';
import { SignalsService } from '../common/signals.service.js';
import { Prisma, SubQuest } from '../generated/prisma/client.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CLOCK, type Clock } from './clock.js';
import { type SubQuestContentDto } from './dto/quest-requests.dto.js';
import { SUB_QUEST_INCLUDE, SubQuestDto, toSubQuestDto } from './dto/quest.dto.js';
import { QuestsService } from './quests.service.js';
import { conflict, notFound } from './refusals.js';
import { tellStepChanged, TimesToLeave } from './step-told.js';
import { columnsOf } from './sub-quest-columns.js';

const subQuestNotFound = (): Error => notFound('SUB_QUEST_NOT_FOUND', 'This Quest has no such Sub Quest.');

// A change of a step: what it answers, and the step as the change leaves it, or as it was before it was cancelled.
interface StepChange<T> {
  result: T;
  step: SubQuestDto;
  cancelled: boolean;
}

// What a Holder does to the Sub Quests of a Quest.
@Injectable()
export class SubQuestsService {
  private readonly logger = new Logger(SubQuestsService.name);

  constructor(
    private readonly quests: QuestsService,
    private readonly signals: SignalsService,
    private readonly notifications: NotificationsService,
    private readonly timesToLeave: TimesToLeave,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  add(userId: string, questId: string, content: SubQuestContentDto): Promise<SubQuestDto> {
    return this.changeStep(userId, questId, async (tx) => {
      const subQuest = await tx.subQuest.create({
        data: { questId, ...(await columnsOf(content, tx)) },
        include: SUB_QUEST_INCLUDE,
      });
      const step = toSubQuestDto(subQuest, null, userId, this.clock.now());
      return { result: step, step, cancelled: false };
    });
  }

  edit(userId: string, questId: string, subQuestId: string, content: SubQuestContentDto): Promise<SubQuestDto> {
    return this.changeStep(userId, questId, async (tx) => {
      await this.added(questId, subQuestId, tx);
      const subQuest = await tx.subQuest.update({
        where: { id: subQuestId },
        data: await columnsOf(content, tx),
        include: SUB_QUEST_INCLUDE,
      });
      const step = toSubQuestDto(subQuest, null, userId, this.clock.now());
      return { result: step, step, cancelled: false };
    });
  }

  async cancel(userId: string, questId: string, subQuestId: string): Promise<void> {
    await this.changeStep(userId, questId, async (tx) => {
      await this.added(questId, subQuestId, tx);
      if ((await tx.subQuest.count({ where: { questId } })) === 1) {
        throw conflict('LAST_SUB_QUEST', 'The only Sub Quest of a Quest cannot be cancelled.');
      }
      const before = await tx.subQuest.findUniqueOrThrow({ where: { id: subQuestId }, include: SUB_QUEST_INCLUDE });
      await tx.subQuest.delete({ where: { id: subQuestId } });
      return { result: undefined, step: toSubQuestDto(before, null, userId, this.clock.now()), cancelled: true };
    });
  }

  // The mark is the Holder's own, so no other Holder is told.
  async markDone(userId: string, questId: string, subQuestId: string): Promise<void> {
    await this.quests.inQuest(userId, questId, async (tx, holder) => {
      await this.findInQuestOrThrow(questId, subQuestId, tx);
      await tx.subQuestProgress.createMany({ data: { subQuestId, holderId: holder.id }, skipDuplicates: true });
    });
  }

  // Removes the Holder's own mark, if there is one; no other Holder is told.
  async unmarkDone(userId: string, questId: string, subQuestId: string): Promise<void> {
    await this.quests.inQuest(userId, questId, async (tx, holder) => {
      await this.findInQuestOrThrow(questId, subQuestId, tx);
      await tx.subQuestProgress.deleteMany({ where: { subQuestId, holderId: holder.id } });
    });
  }

  // As QuestsService.changeShared, and tells the Holders of the change (tellStepChanged), unless the step has ended.
  private async changeStep<T>(
    userId: string,
    questId: string,
    change: (tx: Prisma.TransactionClient) => Promise<StepChange<T>>,
  ): Promise<T> {
    const { result, holderIds } = await this.quests.inQuest(userId, questId, async (tx) => {
      const changed = await change(tx);
      const { name } = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
      const { title } = await tx.quest.findUniqueOrThrow({ where: { id: questId }, select: { title: true } });
      return { ...changed, byName: name, questTitle: title };
    });
    this.signals.send(holderIds, 'quests-changed');
    const { step, cancelled, byName, questTitle } = result;
    if (!step.ended) {
      const startsAt = step.startsAt === null ? null : new Date(step.startsAt);
      const changed = { questId, questTitle, byId: userId, byName, stepTitle: step.title, startsAt, cancelled };
      const { notifications, logger, timesToLeave } = this;
      await tellStepChanged({ notifications, logger, timesToLeave }, holderIds, changed, { now: this.clock.now() });
    }
    return result.result;
  }

  // The Sub Quest of the Quest, or `SUB_QUEST_NOT_FOUND` when the Quest has no Sub Quest with that id.
  private async findInQuestOrThrow(
    questId: string,
    subQuestId: string,
    tx: Prisma.TransactionClient,
  ): Promise<SubQuest> {
    const subQuest = await tx.subQuest.findFirst({ where: { id: subQuestId, questId } });
    if (subQuest === null) {
      throw subQuestNotFound();
    }
    return subQuest;
  }

  // A Sub Quest of the Quest that a Holder added, which a Holder may edit or cancel.
  private async added(questId: string, subQuestId: string, tx: Prisma.TransactionClient): Promise<SubQuest> {
    const subQuest = await this.findInQuestOrThrow(questId, subQuestId, tx);
    if (subQuest.attending) {
      throw conflict(
        'ATTENDING_SUB_QUEST',
        'The Sub Quest for attending follows its Global Event and cannot be edited or cancelled.',
      );
    }
    return subQuest;
  }
}
