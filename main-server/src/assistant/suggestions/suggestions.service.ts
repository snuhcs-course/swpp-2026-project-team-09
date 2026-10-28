/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-10-28  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { databaseCauseOf } from '../../common/database-cause.js';
import { PrismaService } from '../../common/prisma.service.js';
import { type Settings } from '../../common/settings.js';
import { type Prisma, SuggestionOutcome } from '../../generated/prisma/client.js';
import { CLOCK, type Clock } from '../../quests/clock.js';
import { conflict, notFound } from '../../quests/refusals.js';
import { type QuestProposal } from '../proposal.js';
import {
  ACCEPTANCE_WINDOW_DAYS,
  COOLDOWN_AFTER_SECOND_HOURS,
  REPEAT_WINDOW_DAYS,
  TEMPLATES,
  TYPED_WITHIN_MINUTES,
} from './constants.js';
import { type SuggestionAnswerDto, type SuggestionOutcomeDto, type SuggestionQuery } from './dto/suggestion.dto.js';
import { heldBack } from './holdback.js';
import { koreaMidnight, koreaMinutes } from './korea-day.js';
import { type RandomSource, SUGGESTION_RANDOM } from './random.js';
import { type Bucket, bucketOf, draw, fatigueAt, type Impressions, scoreOf, thresholdOf } from './scoring.js';
import { type EligibleSuggestion, SuggestionCandidates } from './suggestion-candidates.service.js';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
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

interface Scored {
  candidate: EligibleSuggestion;
  score: number;
}

// The ids a Proposal names, as the candidates' keys are written.
function keysOf({ place, globalEvent, invitees }: QuestProposal): string[] {
  return [
    ...(place === null ? [] : [`place:${place.id}`]),
    ...(globalEvent === null ? [] : [`globalEvent:${globalEvent.id}`]),
    ...invitees.map(({ id }) => `friend:${id}`),
  ];
}

// The grey suggestion: the templates that apply now, scored, the shown one drawn, and one row of
// suggestion_impressions for every answer, shown or silent.
@Injectable()
export class SuggestionsService {
  private readonly logger = new Logger(SuggestionsService.name);
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
    const bucket = bucketOf(koreaMinutes(now));
    const [eligible, impressions] = await Promise.all([
      this.candidates.eligible(userId, now, query, history.madeFromSuggestions),
      this.impressionsIn(bucket, now),
    ]);
    const holdback = heldBack(userId, this.holdbackPercent);
    // During a cooldown every score is 0, so nothing reaches its threshold and the row says what was held back.
    const fatigue = fatigueAt(now, history.dismissedAt);
    const scored = eligible
      .map((candidate): Scored => {
        const { template, repeats } = candidate;
        const counted = impressions.get(template) ?? { shown: 0, accepted: 0 };
        return { candidate, score: scoreOf({ template, impressions: counted, repeats, fatigue, holdback }) };
      })
      .toSorted(
        (a, b) =>
          b.score - a.score || TEMPLATES.indexOf(a.candidate.template) - TEMPLATES.indexOf(b.candidate.template),
      );
    const above = scored.filter(({ candidate, score }) => score >= thresholdOf(candidate.template));
    const drawn = above.length === 0 ? null : draw(above.length, () => this.random.next());
    const shown = drawn === null ? null : above[drawn.index].candidate;
    const { id } = await this.prisma.suggestionImpression.create({
      data: {
        userId,
        template: shown?.template ?? null,
        eligible: scored.map(({ candidate }) => candidate.template),
        candidates: scored.flatMap(({ candidate }) => candidate.keys.map((key) => `${candidate.template} ${key}`)),
        bucket,
        propensity: drawn?.propensity ?? null,
        holdback,
        shownAt: now,
        outcome: shown === null ? SuggestionOutcome.silent : SuggestionOutcome.shown,
      },
      select: { id: true },
    });
    return { suggestion: shown === null ? null : { id, text: shown.text, reason: shown.reason, action: shown.action } };
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

  // A Proposal the User asked for in the chat, matched to the row of the chat opened in the last 10 minutes: the first
  // eligible template, best score first, whose action would have taken one of the Proposal's ids is written as typed.
  // It is the template shown when the User typed what was suggested, and a missed need when it is another. Matching
  // never fails the reply: a row that cannot be written is logged by its cause.
  async typedInstead(userId: string, proposal: QuestProposal, now: Date): Promise<void> {
    const keys = keysOf(proposal);
    if (keys.length === 0) {
      return;
    }
    try {
      const row = await this.prisma.suggestionImpression.findFirst({
        where: {
          userId,
          typedTemplate: null,
          shownAt: { gt: new Date(now.getTime() - TYPED_WITHIN_MINUTES * MINUTE_MS), lte: now },
        },
        orderBy: { shownAt: 'desc' },
        select: { id: true, eligible: true, candidates: true },
      });
      const template = row?.eligible.find((name) =>
        row.candidates.some((entry) => entry.startsWith(`${name} `) && keys.includes(entry.slice(name.length + 1))),
      );
      if (row === null || row === undefined || template === undefined) {
        return;
      }
      await this.prisma.suggestionImpression.update({
        where: { id: row.id },
        data: { typedTemplate: template, typedAt: now },
      });
    } catch (error) {
      this.logger.warn(`A typed request was not matched to its suggestion: ${databaseCauseOf(error)}`);
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
  // Silent rows showed no template, so they count for none.
  private async impressionsIn(bucket: Bucket, now: Date): Promise<Map<string, Impressions>> {
    const shown: Prisma.SuggestionImpressionWhereInput = {
      bucket,
      template: { not: null },
      shownAt: { gte: new Date(now.getTime() - ACCEPTANCE_WINDOW_DAYS * DAY_MS), lte: now },
    };
    const groups = await this.prisma.suggestionImpression.groupBy({
      by: ['template', 'outcome'],
      where: shown,
      _count: { id: true },
    });
    const counts = new Map<string, Impressions>();
    for (const { template, outcome, _count } of groups) {
      if (template === null) {
        continue;
      }
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
