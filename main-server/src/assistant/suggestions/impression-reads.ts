/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type PrismaService } from '../../common/prisma.service.js';
import { type Prisma, SuggestionMoment, SuggestionOutcome } from '../../generated/prisma/client.js';
import {
  ACCEPTANCE_WINDOW_DAYS,
  COOLDOWN_AFTER_SECOND_HOURS,
  IGNORED_AFTER_MINUTES,
  RECEPTIVENESS_IMPRESSIONS,
} from './constants.js';
import { koreaMidnight } from './korea-day.js';
import { type Bucket, type Impressions } from './scoring.js';

// What the grey suggestions read of suggestion_impressions, when the chat opens and after an answer.

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// The User's newest shown impressions of the moment, within the days given, whose outcome is settled, one still shown
// ten minutes on having been ignored, by which their receptiveness is read; a confirmation counts as accepted.
export async function recentlyShown(
  prisma: PrismaService,
  userId: string,
  moment: SuggestionMoment,
  days: number,
  now: Date,
): Promise<Impressions> {
  const rows = await prisma.suggestionImpression.findMany({
    where: {
      userId,
      moment,
      template: { not: null },
      shownAt: { gte: new Date(now.getTime() - days * DAY_MS), lte: now },
      OR: [
        { outcome: { not: SuggestionOutcome.shown } },
        { shownAt: { lte: new Date(now.getTime() - IGNORED_AFTER_MINUTES * MINUTE_MS) } },
      ],
    },
    orderBy: { shownAt: 'desc' },
    take: RECEPTIVENESS_IMPRESSIONS,
    select: { outcome: true },
  });
  return {
    shown: rows.length,
    accepted: rows.filter(
      ({ outcome }) => outcome === SuggestionOutcome.accepted || outcome === SuggestionOutcome.confirmed,
    ).length,
  };
}

// Each template's impressions of all Users in this bucket over the last 30 days, a confirmation counted as accepted.
// Silent rows showed no template, so they count for none.
export async function impressionsIn(
  prisma: PrismaService,
  bucket: Bucket,
  now: Date,
): Promise<Map<string, Impressions>> {
  const shown: Prisma.SuggestionImpressionWhereInput = {
    bucket,
    template: { not: null },
    shownAt: { gte: new Date(now.getTime() - ACCEPTANCE_WINDOW_DAYS * DAY_MS), lte: now },
  };
  const groups = await prisma.suggestionImpression.groupBy({
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

// The User's dismissals that can still hold suggestions back: none before the day of six hours ago.
export async function dismissalsNear(prisma: PrismaService, userId: string, now: Date): Promise<Date[]> {
  const rows = await prisma.suggestionImpression.findMany({
    where: {
      userId,
      outcome: SuggestionOutcome.dismissed,
      outcomeAt: { gte: koreaMidnight(new Date(now.getTime() - COOLDOWN_AFTER_SECOND_HOURS * HOUR_MS)), lte: now },
    },
    select: { outcomeAt: true },
  });
  return rows.flatMap(({ outcomeAt }) => (outcomeAt === null ? [] : [outcomeAt]));
}
