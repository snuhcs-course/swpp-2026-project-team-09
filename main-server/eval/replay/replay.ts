/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-10-28  Fable 5.1  prompted by fyoon46
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { koreaTime } from '../../src/assistant/korea-time.js';
import { type PrismaClient } from '../../src/generated/prisma/client.js';
import { type PlaceDto } from '../../src/places/dto/place.dto.js';
import { catalogOf, connectToDatabase } from './database.ts';
import { replayFlags } from './flags.ts';
import { acceptedIds, activeAt, fingerprintOf, type GoldItem, itemsOf, loadGold, updatesOf } from './gold.ts';
import { type LearnedAliases, learnedAliases } from './learned-aliases.ts';
import { SHOWN_MAX, type StageMetrics, stageMetrics } from './replay-metrics.ts';
import { saveReport, table } from './report.ts';
import { type Stage, type StageAnswer, type StageName, stageA, stageB, withAliases } from './stages.ts';
import { shown } from './wilson.ts';

// `pnpm eval:replay [--gold <file>] [--as-of <day>] [--development]` (P07 tickets 05 and 06): every gold item answered
// by stages A, B, C and D, and each stage's numbers. See README.md, "Assistant". It never calls the model.

const STAGES: StageName[] = ['A', 'B', 'C', 'D'];

// The account the gold items are asked as. No account has this id, so it has taught no alias of its own, and the
// replay holds nobody back: stages C and D answer with everyone's aliases, as for a User of the learning arm.
const GOLD_USER = '00000000-0000-4000-8000-000000000000';

export interface ItemAnswer {
  result: StageAnswer['result'];
  tier: string | null;
  source: StageAnswer['source'];
  // How many Places were found, and the names of the first 10.
  found: number;
  candidates: string[];
  top1: boolean;
  recallAt10: boolean;
}

export interface ItemReplay {
  words: string;
  collected: string;
  note: string | null;
  accept: string[];
  answers: Record<StageName, ItemAnswer>;
}

export interface GoldReplay {
  set: GoldItem['set'];
  // Of the whole set, the items with a window too (gold.ts).
  fingerprint: string;
  // How many items of the set hold only from or until a day.
  updates: number;
  asOf: string;
  // The personal aliases rebuilt, and the words with everyone's alias by the count (C) and by the chain (D).
  learned: { personal: number; counted: number; chained: number };
  stages: Record<StageName, StageMetrics>;
  items: ItemReplay[];
}

function itemAnswer(names: ReadonlyMap<string, string>, accept: ReadonlySet<string>, answer: StageAnswer): ItemAnswer {
  const shownIds = answer.candidates.slice(0, SHOWN_MAX);
  return {
    result: answer.result,
    tier: answer.tier,
    source: answer.source,
    found: answer.candidates.length,
    candidates: shownIds.map((id) => names.get(id) ?? id),
    top1: accept.has(answer.candidates[0] ?? ''),
    recallAt10: shownIds.some((id) => accept.has(id)),
  };
}

type Answers = Record<StageName, StageAnswer>;

// The four stages' answers to the words, asked as the gold account.
async function answersOf(stages: Record<StageName, Stage>, words: string): Promise<Answers> {
  const [A, B, C, D] = await Promise.all(STAGES.map((stage) => stages[stage](words, GOLD_USER)));
  if (A === undefined || B === undefined || C === undefined || D === undefined) {
    throw new Error('A stage gave no answer');
  }
  return { A, B, C, D };
}

function stagesOf(places: readonly PlaceDto[], learned: LearnedAliases): Record<StageName, Stage> {
  return {
    A: stageA(places),
    B: stageB(places),
    C: withAliases(places, { personal: learned.personal, global: learned.counted }),
    D: withAliases(places, { personal: learned.personal, global: learned.chained }),
  };
}

// `set` is every item of the set; those that hold at `asOf` are scored.
export async function replayGold(prisma: PrismaClient, set: readonly GoldItem[], asOf: Date): Promise<GoldReplay> {
  const items = activeAt(set, asOf);
  if (items.length === 0) {
    throw new Error(`No item of the set holds on ${koreaTime(asOf)}.`);
  }
  const places = await catalogOf(prisma);
  const names = new Map(places.map(({ id, name }) => [id, name]));
  const learned = await learnedAliases(prisma, places, {
    before: asOf,
    excluding: [],
    words: items.map(({ words }) => words),
    holdbackPercent: 0,
  });
  const stages = stagesOf(places, learned);
  const accepted = acceptedIds(items, places);
  const scored = await Promise.all(
    items.map(async (item, index) => ({
      item,
      accept: accepted[index] ?? new Set<string>(),
      answers: await answersOf(stages, item.words),
    })),
  );
  const metricsOf = (stage: StageName): StageMetrics =>
    stageMetrics(scored.map(({ accept, answers }) => ({ accept, answer: answers[stage] })));
  const itemAnswers = (accept: ReadonlySet<string>, answers: Answers): Record<StageName, ItemAnswer> => ({
    A: itemAnswer(names, accept, answers.A),
    B: itemAnswer(names, accept, answers.B),
    C: itemAnswer(names, accept, answers.C),
    D: itemAnswer(names, accept, answers.D),
  });
  return {
    set: items[0]?.set ?? 'test',
    fingerprint: fingerprintOf(set),
    updates: updatesOf(set),
    asOf: koreaTime(asOf),
    learned: { personal: learned.personalCount, counted: learned.countedCount, chained: learned.chainedCount },
    stages: { A: metricsOf('A'), B: metricsOf('B'), C: metricsOf('C'), D: metricsOf('D') },
    items: scored.map(({ item, accept, answers }) => ({
      words: item.words,
      collected: item.collected,
      note: item.note ?? null,
      accept: [...new Set([...accept].map((id) => names.get(id) ?? id))],
      answers: itemAnswers(accept, answers),
    })),
  };
}

// An item's answer in a cell: the result, how many, the first, and ✓ when it is accepted, @10 when an accepted Place
// is further down, ✗ otherwise. A none is right only for words that name no Place.
function cell(item: ItemReplay, answer: ItemAnswer): string {
  if (answer.result === 'none') {
    return item.accept.length === 0 ? 'none ✓' : 'none ✗';
  }
  let mark = '✗';
  if (answer.top1) {
    mark = '✓';
  } else if (answer.recallAt10) {
    mark = '@10';
  }
  const more = answer.found > 1 ? ` (${answer.found})` : '';
  return `${answer.result}${more} ${answer.candidates[0] ?? ''} ${mark}`;
}

function tiersOf({ tiers }: StageMetrics): string {
  return Object.entries(tiers)
    .map(([tier, count]) => `${tier} ${count}`)
    .join(', ');
}

export function goldMarkdown(replay: GoldReplay): string {
  const { stages } = replay;
  const row = (label: string, value: (metrics: StageMetrics) => string): string[] => [
    label,
    ...STAGES.map((stage) => value(stages[stage])),
  ];
  return [
    '# Replay of the gold set: A, B, C and D',
    '',
    `The ${replay.set} set, fingerprint ${replay.fingerprint}, ${replay.items.length} items holding on ${replay.asOf}` +
      `${replay.updates === 0 ? '' : ` (${replay.updates} of the set hold only from or until a day: run at several --as-of days to see when stages C and D follow)`}. ` +
      `Stages C and D learned from the events before ${replay.asOf}: ${replay.learned.personal} personal aliases, ` +
      `and of everyone's for these words ${replay.learned.counted} by the count (C) and ${replay.learned.chained} by ` +
      'the alias chain (D), the rule the server learns by. Each rate: value, 95% Wilson interval, k/n. The test set ' +
      'is frozen before any rule or group table is tuned on it; a run whose fingerprint differs scores another set.',
    '',
    table(
      ['', 'A: substring', 'B: rules and groups', 'C: B and aliases by the count', 'D: B and aliases by the chain'],
      [
        row('Resolution (not none)', ({ resolution }) => shown(resolution)),
        row('Precision of one', ({ precisionOfOne }) => shown(precisionOfOne)),
        row('Recall@10', ({ recallAt10 }) => shown(recallAt10)),
        row('Top-1', ({ top1 }) => shown(top1)),
        row('None', ({ none }) => shown(none)),
        row('False none', ({ falseNone }) => shown(falseNone)),
        row('Mean candidates shown', ({ meanCandidates }) => meanCandidates?.toFixed(2) ?? '—'),
        row('Tiers', tiersOf),
        row('Alias hits, curated / learned', ({ aliasHits }) => `${aliasHits.curated} / ${aliasHits.learned}`),
      ],
    ),
    '',
    '## Items',
    '',
    table(
      ['Words', 'Accepts', ...STAGES],
      replay.items.map((item) => [
        item.words,
        item.accept.length === 0 ? '(none)' : item.accept.join(', '),
        ...STAGES.map((stage) => cell(item, item.answers[stage])),
      ]),
    ),
  ].join('\n');
}

export async function main(argv: string[]): Promise<number> {
  const startedAt = new Date();
  const { gold, asOf, development } = replayFlags(argv, startedAt);
  const items = itemsOf(loadGold(gold), development ? 'development' : 'test');
  const prisma = connectToDatabase();
  try {
    const replay = await replayGold(prisma, items, asOf);
    for (const file of saveReport('stages', replay, goldMarkdown(replay), startedAt)) {
      console.log(file);
    }
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}
