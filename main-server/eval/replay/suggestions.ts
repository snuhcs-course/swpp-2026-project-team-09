/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-10-28  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { koreaTime } from '../../src/assistant/korea-time.js';
import { type PrismaClient } from '../../src/generated/prisma/client.js';
import { connectToDatabase } from './database.ts';
import { suggestionFlags, type SuggestionFlags } from './flags.ts';
import { saveReport, table } from './report.ts';
import {
  type NeedCell,
  needCells,
  type Openings,
  openingsOf,
  SETTLED_MS,
  type SuggestionCell,
  suggestionCells,
  type WeightedAcceptance,
  weightedAcceptance,
} from './suggestion-metrics.ts';
import { shown } from './wilson.ts';

// `pnpm eval:suggestions --from <day> --to <day> [--final-from <day>]` (P07 ticket 05): the grey suggestions'
// acceptance per week and template from suggestion_impressions, the held-back accounts apart, each template's
// acceptance weighted by inverse propensity, and its missed needs and false alarms (research note 10 §1). See
// README.md, "Assistant". It never calls the model.

export interface SuggestionCurves {
  from: string;
  until: string;
  finalFrom: string | null;
  // Rows of the last 10 minutes before the run are left out: their outcome may still come.
  settledBefore: string;
  openings: Openings[];
  weeks: SuggestionCell[];
  needs: NeedCell[];
  weighted: WeightedAcceptance[];
}

export async function suggestionCurves(
  prisma: PrismaClient,
  { from, until, finalFrom }: SuggestionFlags,
  now: Date,
): Promise<SuggestionCurves> {
  const settledBefore = new Date(now.getTime() - SETTLED_MS);
  const end = Math.min(until.getTime(), settledBefore.getTime());
  const impressions = await prisma.suggestionImpression.findMany({
    where: { shownAt: { gte: from, lt: new Date(end) } },
    select: {
      template: true,
      eligible: true,
      propensity: true,
      holdback: true,
      shownAt: true,
      outcome: true,
      outcomeAt: true,
      typedTemplate: true,
    },
  });
  return {
    from: koreaTime(from),
    until: koreaTime(until),
    finalFrom: finalFrom === null ? null : koreaTime(finalFrom),
    settledBefore: koreaTime(settledBefore),
    openings: openingsOf(impressions, finalFrom),
    weeks: suggestionCells(impressions, finalFrom),
    needs: needCells(impressions, finalFrom),
    weighted: weightedAcceptance(impressions, finalFrom),
  };
}

const arm = (holdback: boolean): string => (holdback ? 'holdback' : 'learning');

function slicesLine(curves: SuggestionCurves): string {
  return curves.finalFrom === null
    ? 'No final slice was set: every row is one slice.'
    : `The rows from ${curves.finalFrom} are the final slice, which tunes nothing; report its numbers alone once the ` +
        'tuning is done.';
}

function openingsTable(curves: SuggestionCurves): string {
  return table(
    ['Slice', 'Openings', 'Silent', 'Silent, then a covered request typed'],
    curves.openings.map((opening) => [
      opening.slice,
      String(opening.openings),
      String(opening.silent),
      String(opening.silentThenTyped),
    ]),
  );
}

function weeksTable(curves: SuggestionCurves): string {
  return table(
    ['Slice', 'Week', 'Template', 'Arm', 'Shown', 'Accepted', 'Confirmed in 10 min', 'Dismissed', 'Ignored'],
    curves.weeks.map((cell) => [
      cell.slice,
      cell.week,
      cell.template,
      arm(cell.holdback),
      String(cell.shown),
      shown(cell.acceptance),
      shown(cell.confirmedWithin10Minutes),
      shown(cell.dismissal),
      shown(cell.ignored),
    ]),
  );
}

function needsTable(curves: SuggestionCurves): string {
  return table(
    [
      'Slice',
      'Template',
      'Arm',
      'Shown',
      'Accepted',
      'False alarm',
      'Eligible, not shown',
      'Missed need',
      'Recall',
      'Typed what was shown',
    ],
    curves.needs.map((cell) => [
      cell.slice,
      cell.template,
      arm(cell.holdback),
      String(cell.shown),
      shown(cell.accepted),
      shown(cell.falseAlarm),
      String(cell.eligibleNotShown),
      shown(cell.missedNeed),
      shown(cell.recall),
      String(cell.typedWhatWasShown),
    ]),
  );
}

function weightedTable(curves: SuggestionCurves): string {
  return table(
    ['Slice', 'Template', 'Arm', 'Shown', 'Acceptance'],
    curves.weighted.map(({ slice, template, holdback, shown: count, acceptance }) => [
      slice,
      template,
      arm(holdback),
      String(count),
      acceptance === null ? '—' : `${(acceptance * 100).toFixed(1)}%`,
    ]),
  );
}

export function suggestionsMarkdown(curves: SuggestionCurves): string {
  return [
    '# Suggestion curves',
    '',
    `Openings from ${curves.from} until ${curves.until}, those after ${curves.settledBefore} left out. ` +
      `${slicesLine(curves)} Accepted counts a confirmed one too; ignored is still shown 10 minutes on. Each rate: ` +
      'value, 95% Wilson interval, k/n.',
    '',
    '## Openings',
    '',
    openingsTable(curves),
    '',
    '## Shown, per week',
    '',
    weeksTable(curves),
    '',
    '## Missed needs and false alarms',
    '',
    'As ProactiveBench (ICLR 2025) counts them: accepted is a proposal the User took, a false alarm one shown and not ' +
      'taken, and a missed need an opening where the template could have shown, did not, and the User then asked ' +
      'the chat for what it would have proposed. Recall is accepted over accepted and missed.',
    '',
    needsTable(curves),
    '',
    '## Acceptance weighted by inverse propensity',
    '',
    weightedTable(curves),
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
