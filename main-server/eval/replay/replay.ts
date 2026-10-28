/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { koreaTime } from '../../src/assistant/korea-time.js';
import { type PrismaClient } from '../../src/generated/prisma/client.js';
import { catalogOf, connectToDatabase } from './database.ts';
import { replayFlags } from './flags.ts';
import { acceptedIds, type GoldItem, itemsOf, loadGold } from './gold.ts';
import { learnedAliases } from './learned-aliases.ts';
import { SHOWN_MAX, type StageMetrics, stageMetrics } from './replay-metrics.ts';
import { saveReport, table } from './report.ts';
import { type StageAnswer, type StageName, stageA, stageB, stageC } from './stages.ts';
import { shown } from './wilson.ts';

// `pnpm eval:replay [--gold <file>] [--as-of <day>] [--development]` (P07 ticket 05): every gold item answered by
// stages A, B and C, and each stage's numbers. See README.md, "Assistant". It never calls the model.

const STAGES: StageName[] = ['A', 'B', 'C'];

// The account the gold items are asked as. No account has this id, so it has taught no alias of its own, and the
// replay holds nobody back: stage C answers with everyone's aliases, as for a User of the learning arm.
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
  asOf: string;
  learned: { personal: number; global: number };
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

export async function replayGold(prisma: PrismaClient, items: readonly GoldItem[], asOf: Date): Promise<GoldReplay> {
  const places = await catalogOf(prisma);
  const names = new Map(places.map(({ id, name }) => [id, name]));
  const learned = await learnedAliases(prisma, {
    before: asOf,
    excluding: [],
    words: items.map(({ words }) => words),
    holdbackPercent: 0,
  });
  const stages = { A: stageA(places), B: stageB(places), C: stageC(places, learned) };
  const accepted = acceptedIds(items, places);
  const scored = await Promise.all(
    items.map(async (item, index) => ({
      item,
      accept: accepted[index] ?? new Set<string>(),
      answers: {
        A: await stages.A(item.words, GOLD_USER),
        B: await stages.B(item.words, GOLD_USER),
        C: await stages.C(item.words, GOLD_USER),
      },
    })),
  );
  const metricsOf = (stage: StageName): StageMetrics =>
    stageMetrics(scored.map(({ accept, answers }) => ({ accept, answer: answers[stage] })));
  return {
    set: items[0]?.set ?? 'test',
    asOf: koreaTime(asOf),
    learned: { personal: learned.personalCount, global: learned.globalCount },
    stages: { A: metricsOf('A'), B: metricsOf('B'), C: metricsOf('C') },
    items: scored.map(({ item, accept, answers }) => ({
      words: item.words,
      collected: item.collected,
      note: item.note ?? null,
      accept: [...new Set([...accept].map((id) => names.get(id) ?? id))],
      answers: {
        A: itemAnswer(names, accept, answers.A),
        B: itemAnswer(names, accept, answers.B),
        C: itemAnswer(names, accept, answers.C),
      },
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
    '# Replay of the gold set: A, B and C',
    '',
    `The ${replay.set} set, ${replay.items.length} items. Stage C learned from the events before ${replay.asOf}: ` +
      `${replay.learned.personal} personal aliases and ${replay.learned.global} of everyone's for these words. ` +
      'Each rate: value, 95% Wilson interval, k/n.',
    '',
    table(
      ['', 'A: substring', 'B: rules and groups', 'C: B and learned aliases'],
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
      ['Words', 'Accepts', 'A', 'B', 'C'],
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
