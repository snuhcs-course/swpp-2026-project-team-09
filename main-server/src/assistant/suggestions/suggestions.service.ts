/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service.js';
import { type Settings } from '../../common/settings.js';
import { SuggestionOutcome } from '../../generated/prisma/client.js';
import { CLOCK, type Clock } from '../../quests/clock.js';
import { conflict, notFound } from '../../quests/refusals.js';
import { ACCEPTANCE_WINDOW_DAYS, COOLDOWN_AFTER_SECOND_HOURS, REPEAT_WINDOW_DAYS, TEMPLATES } from './constants.js';
import { type SuggestionAnswerDto, type SuggestionOutcomeDto, type SuggestionQuery } from './dto/suggestion.dto.js';
import { heldBack } from './holdback.js';
import { koreaMidnight, koreaMinutes } from './korea-day.js';
import { type RandomSource, SUGGESTION_RANDOM } from './random.js';
import { type Bucket, bucketOf, draw, fatigueAt, type Impressions, scoreOf, thresholdOf } from './scoring.js';
import { SuggestionCandidates } from './suggestion-candidates.service.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// The outcomes each outcome may replace: a tap and × only a suggestion still shown, 만들기 a tapped one too.
const REPLACES: Readonly<Record<SuggestionOutcomeDto['outcome'], SuggestionOutcome[]>> = {
  accepted: [SuggestionOutcome.shown],
  dismissed: [SuggestionOutcome.shown],
  confirmed: [SuggestionOutcome.shown, SuggestionOutcome.accepted],
};

// What the User's own impressions say now: the dismissals that can still hold suggestions back, and the Quests that
// suggestions made, which are no habit.
interface History {
  dismissedAt: Date[];
  madeFromSuggestions: Set<string>;
}

// The grey suggestion: the templates that apply now, scored, the shown one drawn, and its impression logged.
@Injectable()
export class SuggestionsService {
  private readonly holdbackPercent: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly candidates: SuggestionCandidates,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(SUGGESTION_RANDOM) private readonly random: RandomSource,
    settings: ConfigService<Settings, true>,
  ) {
    this.holdbackPercent = settings.get('ASSISTANT_SUGGESTION_HOLDBACK_PERCENT', { infer: true });
  }

  async suggest(userId: string, query: SuggestionQuery): Promise<SuggestionAnswerDto> {
    const now = this.clock.now();
    const history = await this.historyOf(userId, now);
    if (fatigueAt(now, history.dismissedAt) === 0) {
      return { suggestion: null };
    }
    const bucket = bucketOf(koreaMinutes(now));
    const [eligible, impressions] = await Promise.all([
      this.candidates.eligible(userId, now, query, history.madeFromSuggestions),
      this.impressionsIn(bucket, now),
    ]);
    const holdback = heldBack(userId, this.holdbackPercent);
    const scored = eligible
      .map((candidate) => {
        const { template, repeats } = candidate;
        const counted = impressions.get(template) ?? { shown: 0, accepted: 0 };
        return { candidate, score: scoreOf({ template, impressions: counted, repeats, fatigue: 1, holdback }) };
      })
      .toSorted(
        (a, b) =>
          b.score - a.score || TEMPLATES.indexOf(a.candidate.template) - TEMPLATES.indexOf(b.candidate.template),
      );
    const above = scored.filter(({ candidate, score }) => score >= thresholdOf(candidate.template));
    if (above.length === 0) {
      return { suggestion: null };
    }
    const { index, propensity } = draw(above.length, () => this.random.next());
    const shown = above[index].candidate;
    const { id } = await this.prisma.suggestionImpression.create({
      data: {
        userId,
        template: shown.template,
        eligible: scored.map(({ candidate }) => candidate.template),
        bucket,
        propensity,
        holdback,
        shownAt: now,
      },
      select: { id: true },
    });
    return { suggestion: { id, text: shown.text, reason: shown.reason, action: shown.action } };
  }

  // The same outcome again changes nothing; one that would replace a later one is refused.
  async recordOutcome(userId: string, id: string, body: SuggestionOutcomeDto): Promise<void> {
    const { count } = await this.prisma.suggestionImpression.updateMany({
      where: { id, userId, outcome: { in: REPLACES[body.outcome] } },
      data: {
        outcome: body.outcome,
        outcomeAt: this.clock.now(),
        ...(body.outcome === SuggestionOutcome.confirmed ? { questId: body.questId } : {}),
      },
    });
    if (count > 0) {
      return;
    }
    const stored = await this.prisma.suggestionImpression.findFirst({
      where: { id, userId },
      select: { outcome: true },
    });
    if (stored === null) {
      throw notFound('SUGGESTION_NOT_FOUND', 'No such suggestion was shown to this User.');
    }
    if (stored.outcome !== body.outcome) {
      throw conflict('SUGGESTION_OUTCOME_SETTLED', `The suggestion was ${stored.outcome} already.`);
    }
  }

  // A dismissal before the day of six hours ago can hold nothing back now. A Quest made from a suggestion starts
  // within a day of it, so those of the repeat window and a day are enough.
  private async historyOf(userId: string, now: Date): Promise<History> {
    const rows = await this.prisma.suggestionImpression.findMany({
      where: {
        userId,
        OR: [
          {
            outcome: SuggestionOutcome.dismissed,
            outcomeAt: {
              gte: koreaMidnight(new Date(now.getTime() - COOLDOWN_AFTER_SECOND_HOURS * HOUR_MS)),
              lte: now,
            },
          },
          {
            outcome: SuggestionOutcome.confirmed,
            shownAt: { gte: new Date(now.getTime() - (REPEAT_WINDOW_DAYS + 1) * DAY_MS) },
          },
        ],
      },
      select: { outcome: true, outcomeAt: true, questId: true },
    });
    return {
      dismissedAt: rows.flatMap(({ outcome, outcomeAt }) =>
        outcome === SuggestionOutcome.dismissed && outcomeAt !== null ? [outcomeAt] : [],
      ),
      madeFromSuggestions: new Set(rows.flatMap(({ questId }) => (questId === null ? [] : [questId]))),
    };
  }

  // Each template's impressions of all Users in this bucket over the last 30 days, a confirmation counted as accepted.
  private async impressionsIn(bucket: Bucket, now: Date): Promise<Map<string, Impressions>> {
    const groups = await this.prisma.suggestionImpression.groupBy({
      by: ['template', 'outcome'],
      where: { bucket, shownAt: { gte: new Date(now.getTime() - ACCEPTANCE_WINDOW_DAYS * DAY_MS), lte: now } },
      _count: { id: true },
    });
    const counts = new Map<string, Impressions>();
    for (const { template, outcome, _count } of groups) {
      const counted = counts.get(template) ?? { shown: 0, accepted: 0 };
      counted.shown += _count.id;
      if (outcome === SuggestionOutcome.accepted || outcome === SuggestionOutcome.confirmed) {
        counted.accepted += _count.id;
      }
      counts.set(template, counted);
    }
    return counts;
  }
}
