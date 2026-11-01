/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { databaseCauseOf } from '../../common/database-cause.js';
import { heldBack } from '../../common/holdback.js';
import { PrismaService } from '../../common/prisma.service.js';
import { type Settings } from '../../common/settings.js';
import { SuggestionMoment, SuggestionOutcome } from '../../generated/prisma/client.js';
import { CLOCK, type Clock } from '../../quests/clock.js';
import { type AssistantReplyDto, type NextLineDto } from '../dto/assistant-messages.dto.js';
import {
  HOLDBACK_ACCEPTANCE,
  NEXT_LINE_RECEPTIVENESS_DAYS,
  NEXT_LINE_RECEPTIVENESS_THRESHOLD,
  NEXT_LINE_THRESHOLD,
} from './constants.js';
import { dismissalsNear, impressionsIn, recentlyShown } from './impression-reads.js';
import { koreaMinutes } from './korea-day.js';
import { nextLinesOf } from './next-line.js';
import { type RandomSource, SUGGESTION_RANDOM } from './random.js';
import { acceptanceOf, bucketOf, draw, fatigueAt } from './scoring.js';

type Answer = Pick<AssistantReplyDto, 'mapButtons' | 'cards' | 'proposal' | 'choices'>;

// The next line of an answer (P07 ticket 09): the lines it leaves, scored and drawn as the grey suggestions are, and
// one row of suggestion_impressions when any was eligible. It calls no model, and a failure is logged with the answer
// standing, as with no line.
@Injectable()
export class NextLines {
  private readonly logger = new Logger(NextLines.name);
  private readonly holdbackPercent: number;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(SUGGESTION_RANDOM) private readonly random: RandomSource,
    settings: ConfigService<Settings, true>,
  ) {
    this.holdbackPercent = settings.get('ASSISTANT_SUGGESTION_HOLDBACK_PERCENT', { infer: true });
  }

  async of(userId: string, answer: Answer): Promise<NextLineDto | null> {
    const now = this.clock.now();
    const eligible = nextLinesOf(answer, now);
    if (eligible.length === 0) {
      return null;
    }
    try {
      const bucket = bucketOf(koreaMinutes(now));
      const [impressions, recent, dismissed] = await Promise.all([
        impressionsIn(this.prisma, bucket, now),
        recentlyShown(this.prisma, userId, SuggestionMoment.answer, NEXT_LINE_RECEPTIVENESS_DAYS, now),
        dismissalsNear(this.prisma, userId, now),
      ]);
      const holdback = heldBack(userId, this.holdbackPercent);
      const receptiveness = acceptanceOf(recent);
      const gated = !holdback && receptiveness < NEXT_LINE_RECEPTIVENESS_THRESHOLD;
      const scored = eligible
        .map((line) => {
          const counted = impressions.get(line.template) ?? { shown: 0, accepted: 0 };
          return { line, score: holdback ? HOLDBACK_ACCEPTANCE : acceptanceOf(counted) };
        })
        .toSorted((a, b) => b.score - a.score);
      const open = !gated && fatigueAt(now, dismissed) > 0;
      const top = scored.findIndex(({ score }) => score >= NEXT_LINE_THRESHOLD);
      const drawn = open ? draw(top === -1 ? null : top, scored.length, () => this.random.next()) : null;
      const shown = drawn === null ? null : (scored[drawn.index]?.line ?? null);
      const { id } = await this.prisma.suggestionImpression.create({
        data: {
          userId,
          moment: SuggestionMoment.answer,
          template: shown?.template ?? null,
          eligible: scored.map(({ line }) => line.template),
          candidates: [],
          bucket,
          propensity: drawn?.propensity ?? null,
          holdback,
          receptiveness,
          gated,
          shownAt: now,
          outcome: shown === null ? SuggestionOutcome.silent : SuggestionOutcome.shown,
        },
        select: { id: true },
      });
      return shown === null ? null : { id, text: shown.text, chosen: shown.chosen };
    } catch (error) {
      this.logger.warn(`An answer's next line was left out: ${databaseCauseOf(error)}`);
      return null;
    }
  }
}
