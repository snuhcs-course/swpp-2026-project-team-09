/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-10-28  Fable 5.1  prompted by fyoon46
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { koreaTime } from '../../src/assistant/korea-time.js';
import { normaliseWords } from '../../src/common/normalise-words.js';
import { type PrismaClient } from '../../src/generated/prisma/client.js';
import { type PlaceDto } from '../../src/places/dto/place.dto.js';
import { catalogOf, connectToDatabase } from './database.ts';
import { replayFlags } from './flags.ts';
import { acceptedIds, activeAt, fingerprintOf, type GoldItem, itemsOf, loadGold, updatesOf } from './gold.ts';
import { type InducedRulesFile, loadRulesFile, rulesAt, rulesFor } from './induced.ts';
import { type LearnedAliases, learnedAliases } from './learned-aliases.ts';
import { SHOWN_MAX, type StageMetrics, stageMetrics } from './replay-metrics.ts';
import { saveReport, table } from './report.ts';
import { type Stage, type StageAnswer, type StageName, stageA, stageB, withAliases, withRules } from './stages.ts';
import { shown } from './wilson.ts';

// `pnpm eval:replay [--gold <file>] [--as-of <day>] [--development] [--rules <file>]...` (P07 tickets 05 to 07):
// every gold item answered by stages A to E, and each stage's numbers. See README.md, "Assistant". It never calls the
// model.

const STAGES: StageName[] = ['A', 'B', 'C', 'D', 'E'];

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
  // The personal aliases rebuilt, the words with everyone's alias by the count (C) and by the chain (D), and the rules
  // of the newest file induced before asOf (E).
  learned: { personal: number; counted: number; chained: number; induced: number };
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

// The stages' answers to the words, asked as the gold account.
async function answersOf(stages: Record<StageName, Stage>, words: string): Promise<Answers> {
  const [A, B, C, D, E] = await Promise.all(STAGES.map((stage) => stages[stage](words, GOLD_USER)));
  if (A === undefined || B === undefined || C === undefined || D === undefined || E === undefined) {
    throw new Error('A stage gave no answer');
  }
  return { A, B, C, D, E };
}

// Stage E for each words: the newest file induced before asOf that never saw the words, so that a gold item a run
// trained on is scored without its rules; one index per file.
function stageE(places: readonly PlaceDto[], files: readonly InducedRulesFile[], asOf: Date): Stage {
  const stages = new Map<InducedRulesFile | null, Stage>();
  return (words, userId): Promise<StageAnswer> => {
    const file = rulesFor(files, normaliseWords(words), asOf);
    const stage = stages.get(file) ?? withRules(places, file?.rules ?? []);
    stages.set(file, stage);
    return stage(words, userId);
  };
}

function stagesOf(
  places: readonly PlaceDto[],
  learned: LearnedAliases,
  files: readonly InducedRulesFile[],
  asOf: Date,
): Record<StageName, Stage> {
  return {
    A: stageA(places),
    B: stageB(places),
    C: withAliases(places, { personal: learned.personal, global: learned.counted }),
    D: withAliases(places, { personal: learned.personal, global: learned.chained }),
    E: stageE(places, files, asOf),
  };
}

interface Scored {
  item: GoldItem;
  accept: Set<string>;
  answers: Answers;
}

function itemReplayOf(names: ReadonlyMap<string, string>, { item, accept, answers }: Scored): ItemReplay {
  const answerOf = (stage: StageName): ItemAnswer => itemAnswer(names, accept, answers[stage]);
  return {
    words: item.words,
    collected: item.collected,
    note: item.note ?? null,
    accept: [...new Set([...accept].map((id) => names.get(id) ?? id))],
    answers: { A: answerOf('A'), B: answerOf('B'), C: answerOf('C'), D: answerOf('D'), E: answerOf('E') },
  };
}

function stageMetricsOf(scored: readonly Scored[]): Record<StageName, StageMetrics> {
  const metricsOf = (stage: StageName): StageMetrics =>
    stageMetrics(scored.map(({ accept, answers }) => ({ accept, answer: answers[stage] })));
  return { A: metricsOf('A'), B: metricsOf('B'), C: metricsOf('C'), D: metricsOf('D'), E: metricsOf('E') };
}

// `set` is every item of the set; those that hold at `asOf` are scored.
export async function replayGold(
  prisma: PrismaClient,
  set: readonly GoldItem[],
  asOf: Date,
  files: readonly InducedRulesFile[] = [],
): Promise<GoldReplay> {
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
  const stages = stagesOf(places, learned, files, asOf);
  const accepted = acceptedIds(items, places);
  const scored: Scored[] = await Promise.all(
    items.map(async (item, index) => ({
      item,
      accept: accepted[index] ?? new Set<string>(),
      answers: await answersOf(stages, item.words),
    })),
  );
  return {
    set: items[0]?.set ?? 'test',
    fingerprint: fingerprintOf(set),
    updates: updatesOf(set),
    asOf: koreaTime(asOf),
    learned: {
      personal: learned.personalCount,
      counted: learned.countedCount,
      chained: learned.chainedCount,
      induced: rulesAt(files, asOf)?.rules.length ?? 0,
    },
    stages: stageMetricsOf(scored),
    items: scored.map((one) => itemReplayOf(names, one)),
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

function summaryTable({ stages }: GoldReplay): string {
  const row = (label: string, value: (metrics: StageMetrics) => string): string[] => [
    label,
    ...STAGES.map((stage) => value(stages[stage])),
  ];
  return table(
    [
      '',
      'A: substring',
      'B: rules and groups',
      'C: B and aliases by the count',
      'D: B and aliases by the chain',
      'E: B and induced rules',
    ],
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
  );
}

export function goldMarkdown(replay: GoldReplay): string {
  return [
    '# Replay of the gold set: A to E',
    '',
    `The ${replay.set} set, fingerprint ${replay.fingerprint}, ${replay.items.length} items holding on ${replay.asOf}` +
      `${replay.updates === 0 ? '' : ` (${replay.updates} of the set hold only from or until a day: run at several --as-of days to see when stages C and D follow)`}. ` +
      `Stages C and D learned from the events before ${replay.asOf}: ${replay.learned.personal} personal aliases, ` +
      `and of everyone's for these words ${replay.learned.counted} by the count (C) and ${replay.learned.chained} by ` +
      'the alias chain (D), the rule the server learns by. Stage E is B with the induced rules of the newest file ' +
      `given that never saw the item's words: ${replay.learned.induced} rules in the newest file, none without ` +
      '--rules. Each rate: value, 95% Wilson interval, k/n. The test set is frozen before any rule or group table is ' +
      'tuned on it; a run whose fingerprint differs scores another set.',
    '',
    summaryTable(replay),
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
  const { gold, asOf, development, rules } = replayFlags(argv, startedAt);
  const items = itemsOf(loadGold(gold), development ? 'development' : 'test');
  const files = rules.map((file) => loadRulesFile(file));
  const prisma = connectToDatabase();
  try {
    const replay = await replayGold(prisma, items, asOf, files);
    for (const file of saveReport('stages', replay, goldMarkdown(replay), startedAt)) {
      console.log(file);
    }
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}
