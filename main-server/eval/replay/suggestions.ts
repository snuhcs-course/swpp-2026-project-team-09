/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { koreaTime } from '../../src/assistant/korea-time.js';
import { type PrismaClient } from '../../src/generated/prisma/client.js';
import { connectToDatabase } from './database.ts';
import { suggestionFlags, type SuggestionFlags } from './flags.ts';
import { saveReport, table } from './report.ts';
import {
  SETTLED_MS,
  type SuggestionCell,
  suggestionCells,
  type WeightedAcceptance,
  weightedAcceptance,
} from './suggestion-metrics.ts';
import { shown } from './wilson.ts';

// `pnpm eval:suggestions --from <day> --to <day>` (P07 ticket 05): the grey suggestions' acceptance per week and
// template from suggestion_impressions, the held-back accounts apart, and each template's acceptance weighted by
// inverse propensity. See README.md, "Assistant". It never calls the model.

export interface SuggestionCurves {
  from: string;
  until: string;
  // Impressions shown in the last 10 minutes before the run are left out: their outcome may still come.
  settledBefore: string;
  weeks: SuggestionCell[];
  weighted: WeightedAcceptance[];
}

export async function suggestionCurves(
  prisma: PrismaClient,
  { from, until }: SuggestionFlags,
  now: Date,
): Promise<SuggestionCurves> {
  const settledBefore = new Date(now.getTime() - SETTLED_MS);
  const end = Math.min(until.getTime(), settledBefore.getTime());
  const impressions = await prisma.suggestionImpression.findMany({
    where: { shownAt: { gte: from, lt: new Date(end) } },
    select: { template: true, propensity: true, holdback: true, shownAt: true, outcome: true, outcomeAt: true },
  });
  return {
    from: koreaTime(from),
    until: koreaTime(until),
    settledBefore: koreaTime(settledBefore),
    weeks: suggestionCells(impressions),
    weighted: weightedAcceptance(impressions),
  };
}

const arm = (holdback: boolean): string => (holdback ? 'holdback' : 'learning');

export function suggestionsMarkdown(curves: SuggestionCurves): string {
  return [
    '# Suggestion curves',
    '',
    `Impressions shown from ${curves.from} until ${curves.until}, those after ${curves.settledBefore} left out. ` +
      'Accepted counts a confirmed one too; ignored is still shown 10 minutes on. Each rate: value, 95% Wilson ' +
      'interval, k/n.',
    '',
    table(
      ['Week', 'Template', 'Arm', 'Shown', 'Accepted', 'Confirmed in 10 min', 'Dismissed', 'Ignored'],
      curves.weeks.map((cell) => [
        cell.week,
        cell.template,
        arm(cell.holdback),
        String(cell.shown),
        shown(cell.acceptance),
        shown(cell.confirmedWithin10Minutes),
        shown(cell.dismissal),
        shown(cell.ignored),
      ]),
    ),
    '',
    '## Acceptance weighted by inverse propensity',
    '',
    table(
      ['Template', 'Arm', 'Shown', 'Acceptance'],
      curves.weighted.map(({ template, holdback, shown: count, acceptance }) => [
        template,
        arm(holdback),
        String(count),
        acceptance === null ? '—' : `${(acceptance * 100).toFixed(1)}%`,
      ]),
    ),
  ].join('\n');
}

export async function main(argv: string[]): Promise<number> {
  const startedAt = new Date();
  const flags = suggestionFlags(argv);
  const prisma = connectToDatabase();
  try {
    const curves = await suggestionCurves(prisma, flags, startedAt);
    for (const file of saveReport('suggestions', curves, suggestionsMarkdown(curves), startedAt)) {
      console.log(file);
    }
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}
