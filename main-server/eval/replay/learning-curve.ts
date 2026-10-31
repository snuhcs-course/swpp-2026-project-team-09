/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-10-28  Fable 5.1  prompted by fyoon46
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { koreaDate } from '../../src/assistant/korea-time.js';
import { heldBack } from '../../src/common/holdback.js';
import { settingsSchema } from '../../src/common/settings.js';
import { type PrismaClient } from '../../src/generated/prisma/client.js';
import { type PlaceDto } from '../../src/places/dto/place.dto.js';
import { type CurveGroup, curveGroup, type EventRow, type LabelledRow, labelledRows } from './curve-metrics.ts';
import { catalogOf, connectToDatabase } from './database.ts';
import { curveFlags, type CurveFlags } from './flags.ts';
import { learnedAliases } from './learned-aliases.ts';
import { saveReport, table } from './report.ts';
import { type Stage, stageB, withAliases } from './stages.ts';
import { type Slice, sliceOf } from './suggestion-metrics.ts';
import { shown } from './wilson.ts';

// `pnpm eval:learning-curve --from <day> --to <day> [--step 7]` (P07 tickets 05 and 06): resolution_events replayed by
// date. At each point T, the aliases rebuilt from the rows before T, by the count and by the chain, answer the labelled
// `answered` Place rows of the step after T, never with the labels being scored, and the ask rate and top-1 are
// reported, the held-back accounts apart. See README.md, "Assistant". It never calls the model.

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CurvePoint {
  // The day of T in Korea; the rows scored are those from T to the next point.
  from: string;
  // The final slice, from --final-from, tunes nothing (research note 10 §3).
  slice: Slice;
  learned: { personal: number; counted: number; chained: number };
  learning: CurveGroup;
  holdback: CurveGroup;
}

export interface LearningCurve {
  stepDays: number;
  holdbackPercent: number;
  finalFrom: string | null;
  points: CurvePoint[];
}

function placeEvents(prisma: PrismaClient): Promise<EventRow[]> {
  return prisma.resolutionEvent.findMany({
    where: { kind: 'place' },
    select: { id: true, userId: true, words: true, outcome: true, chosenId: true, createdAt: true },
  });
}

async function pointAt(
  prisma: PrismaClient,
  places: readonly PlaceDto[],
  rules: Stage,
  scored: readonly LabelledRow[],
  at: { from: Date; holdbackPercent: number; finalFrom: Date | null },
): Promise<CurvePoint> {
  const learned = await learnedAliases(prisma, places, {
    before: at.from,
    excluding: scored.flatMap(({ labels }) => labels.map(({ id }) => id)),
    words: scored.map(({ row }) => row.words),
    holdbackPercent: at.holdbackPercent,
  });
  const counted = withAliases(places, { personal: learned.personal, global: learned.counted });
  const chained = withAliases(places, { personal: learned.personal, global: learned.chained });
  const replayed = await Promise.all(
    scored.map(async ({ row, truth }) => ({
      heldBack: heldBack(row.userId, at.holdbackPercent),
      truth,
      rules: await rules(row.words, row.userId),
      learned: await counted(row.words, row.userId),
      chained: await chained(row.words, row.userId),
    })),
  );
  return {
    from: koreaDate(at.from),
    slice: sliceOf(at.from, at.finalFrom),
    learned: { personal: learned.personalCount, counted: learned.countedCount, chained: learned.chainedCount },
    learning: curveGroup(replayed.filter((row) => !row.heldBack)),
    holdback: curveGroup(replayed.filter((row) => row.heldBack)),
  };
}

export async function learningCurve(
  prisma: PrismaClient,
  { from, to, stepDays, finalFrom }: CurveFlags,
  holdbackPercent: number,
): Promise<LearningCurve> {
  const places = await catalogOf(prisma);
  const rules = stageB(places);
  const labelled = labelledRows(await placeEvents(prisma));
  const points: Date[] = [];
  for (let at = from.getTime(); at <= to.getTime(); at += stepDays * DAY_MS) {
    points.push(new Date(at));
  }
  return {
    stepDays,
    holdbackPercent,
    finalFrom: finalFrom === null ? null : koreaDate(finalFrom),
    points: await Promise.all(
      points.map((point) => {
        const end = point.getTime() + stepDays * DAY_MS;
        const scored = labelled.filter(({ row }) => {
          const time = row.createdAt.getTime();
          return time >= point.getTime() && time < end;
        });
        return pointAt(prisma, places, rules, scored, { from: point, holdbackPercent, finalFrom });
      }),
    ),
  };
}

const CURVE_COLUMNS = [
  'Slice',
  'From',
  'Arm',
  'Aliases personal / count / chain',
  'Rows',
  'Ask, rules',
  'Ask, count',
  'Ask, chain',
  'Top-1, rules',
  'Top-1, count',
  'Top-1, chain',
];

export function curveMarkdown(curve: LearningCurve): string {
  const rows = curve.points.flatMap((point) =>
    (['learning', 'holdback'] as const).map((arm) => {
      const group = point[arm];
      return [
        point.slice,
        point.from,
        arm,
        `${point.learned.personal} / ${point.learned.counted} / ${point.learned.chained}`,
        String(group.n),
        shown(group.askRules),
        shown(group.askLearned),
        shown(group.askChained),
        shown(group.top1Rules),
        shown(group.top1Learned),
        shown(group.top1Chained),
      ];
    }),
  );
  return [
    '# Learning curve',
    '',
    `Each point T scores the labelled answered Place rows of the ${curve.stepDays} days from T with the aliases ` +
      `learned before T. Holdback: ${curve.holdbackPercent}% of accounts, which everyone's aliases never answer. ` +
      "Rules: the matcher with the curated groups only (stage B); count: with the personal aliases and everyone's by " +
      "ticket 03's count (stage C); chain: with the personal aliases and everyone's by the alias chain the server " +
      'learns by (stage D). ' +
      `${
        curve.finalFrom === null
          ? 'No final slice was set: every point is one slice.'
          : `The points from ${curve.finalFrom} are the final slice, which tunes nothing; report its numbers alone once ` +
            'the tuning is done.'
      } Each rate: value, 95% Wilson interval, k/n.`,
    '',
    table(CURVE_COLUMNS, rows),
  ].join('\n');
}

export async function main(argv: string[]): Promise<number> {
  const startedAt = new Date();
  const flags = curveFlags(argv);
  const holdbackPercent = settingsSchema.shape.ASSISTANT_ALIAS_HOLDBACK_PERCENT.parse(
    process.env.ASSISTANT_ALIAS_HOLDBACK_PERCENT,
  );
  const prisma = connectToDatabase();
  try {
    const curve = await learningCurve(prisma, flags, holdbackPercent);
    for (const file of saveReport('learning-curve', curve, curveMarkdown(curve), startedAt)) {
      console.log(file);
    }
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}
