/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { Prisma, SubQuest } from '../generated/prisma/client.js';
import { CLOCK, type Clock } from './clock.js';
import { type SubQuestContentDto } from './dto/quest-requests.dto.js';
import { SUB_QUEST_INCLUDE, SubQuestDto, toSubQuestDto } from './dto/quest.dto.js';
import { QuestsService } from './quests.service.js';
import { conflict, notFound } from './refusals.js';

const subQuestNotFound = (): Error => notFound('SUB_QUEST_NOT_FOUND', 'This Quest has no such Sub Quest.');

// What a Holder does to the Sub Quests of a Quest.
@Injectable()
export class SubQuestsService {
  constructor(
    private readonly quests: QuestsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  add(userId: string, questId: string, content: SubQuestContentDto): Promise<SubQuestDto> {
    return this.quests.changeShared(userId, questId, async (tx) => {
      const subQuest = await tx.subQuest.create({
        data: { questId, ...(await this.quests.columnsOf(content, tx)) },
        include: SUB_QUEST_INCLUDE,
      });
      return toSubQuestDto(subQuest, null, userId, this.clock.now());
    });
  }

  edit(userId: string, questId: string, subQuestId: string, content: SubQuestContentDto): Promise<SubQuestDto> {
    return this.quests.changeShared(userId, questId, async (tx) => {
      await this.added(questId, subQuestId, tx);
      const subQuest = await tx.subQuest.update({
        where: { id: subQuestId },
        data: await this.quests.columnsOf(content, tx),
        include: SUB_QUEST_INCLUDE,
      });
      return toSubQuestDto(subQuest, null, userId, this.clock.now());
    });
  }

  async cancel(userId: string, questId: string, subQuestId: string): Promise<void> {
    await this.quests.changeShared(userId, questId, async (tx) => {
      await this.added(questId, subQuestId, tx);
      if ((await tx.subQuest.count({ where: { questId } })) === 1) {
        throw conflict('LAST_SUB_QUEST', 'The only Sub Quest of a Quest cannot be cancelled.');
      }
      await tx.subQuest.delete({ where: { id: subQuestId } });
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
