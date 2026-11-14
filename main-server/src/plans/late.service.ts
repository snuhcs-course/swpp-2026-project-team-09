/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { SignalsService } from '../common/signals.service.js';
import { QUEST_INCLUDE } from '../quests/dto/quest.dto.js';
import { QuestsService } from '../quests/quests.service.js';
import { conflict } from '../quests/refusals.js';
import { type OwnWay } from './dto/invitation-card.dto.js';
import { type LateBody, type LateSignal } from './dto/late.dto.js';
import { OwnWayReader } from './own-way-reader.service.js';

// A Holder's report of being late: the Quest keeps the minutes, the Holder gets their own way as it now is, and the
// other Holders get only the minutes and the arrival.
@Injectable()
export class LateService {
  constructor(
    private readonly quests: QuestsService,
    private readonly ways: OwnWayReader,
    private readonly signals: SignalsService,
  ) {}

  async report(userId: string, questId: string, { minutes, location }: LateBody): Promise<OwnWay> {
    const now = this.ways.now();
    const { result, holderIds } = await this.quests.inQuest(userId, questId, async (tx, holder) => {
      const quest = await tx.quest.findUniqueOrThrow({ where: { id: questId }, include: QUEST_INCLUDE });
      const { gathered } = this.ways.stepsOf(quest, userId, now);
      if (gathered === null) {
        throw conflict('QUEST_NOT_GATHERING', 'No step of this Quest ahead has a time and a Place.');
      }
      await tx.questHolder.update({ where: { id: holder.id }, data: { lateMinutes: minutes } });
      return { gathered, leaderName: quest.leader.name, subQuestIds: quest.subQuests.map(({ id }) => id) };
    });
    const { gathered, leaderName, subQuestIds } = result;
    // A Holder is busy with the Quest's own Sub Quests, which would leave no Free Time to set out in.
    const way = await this.ways.way(gathered, userId, leaderName, {
      now,
      position: location,
      lateMinutes: minutes,
      leaveOut: subQuestIds,
    });
    const signal: LateSignal = { questId, userId, minutes, arriveAt: way.arriveAt };
    this.signals.send(
      holderIds.filter((id) => id !== userId),
      'late',
      signal,
    );
    this.signals.send(holderIds, 'quests-changed');
    return way;
  }
}
