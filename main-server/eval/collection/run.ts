/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type Model } from '../../src/assistant/adapter.js';
import { type PlaceDto } from '../../src/places/dto/place.dto.js';
import { type Prices } from '../cost.ts';
import { type GoldPair, type GoldPost, type Part, type SavedPost } from './gold.ts';
import { BudgetSpentError } from './budget-spent-error.ts';
import { ModelCalls, type SavedCalls } from './model-calls.ts';
import { type PostParsers, type ReadPost, readPost } from './read-post.ts';
import { isJudged, type PostReading, readingOf } from './reading.ts';
import { type StepMode } from './same-event-step.ts';
import { type ScoreA, scoreA } from './score-a.ts';
import { type ScoreB, scoreB } from './score-b.ts';
import { type Verdict, verdictsOf } from './verdicts.ts';

// One run of evaluation A or B with no database, over the saved pages alone. Each run changes one thing from the run
// before it (metrics document, 4.4), which is what its name says.

export const RUNS = {
  // Evaluation A: the rules alone, then a Judgement, then one more check of the same answers with the Place setting on.
  r0a: { evaluation: 'a', judges: false, place: false },
  judgement: { evaluation: 'a', judges: true, place: false },
  'place-name': { evaluation: 'a', judges: true, place: true },
  // Evaluation B, over one reading: equal starts with title similarity, 08a's rules, then the AI's choice of 08b.
  r0b: { evaluation: 'b', judges: true, mode: 'naive' },
  'title-rule': { evaluation: 'b', judges: true, mode: 'rules' },
  'ai-choice': { evaluation: 'b', judges: true, mode: 'ai' },
} as const;

export type RunName = keyof typeof RUNS;

export const RUN_SWITCHES: Record<RunName, Record<string, boolean | string>> = {
  r0a: { AUTOMATIC_JUDGEMENT: false, SAME_EVENT_TITLE_RULE: false, SAME_EVENT_AI_CHOICE: false },
  judgement: { AUTOMATIC_JUDGEMENT: true, SAME_EVENT_TITLE_RULE: false, SAME_EVENT_AI_CHOICE: false },
  'place-name': { AUTOMATIC_JUDGEMENT: true, SAME_EVENT_TITLE_RULE: false, SAME_EVENT_AI_CHOICE: false },
  r0b: { 'equal starts with title similarity': true, SAME_EVENT_TITLE_RULE: false, SAME_EVENT_AI_CHOICE: false },
  'title-rule': { SAME_EVENT_TITLE_RULE: true, SAME_EVENT_AI_CHOICE: false },
  'ai-choice': { SAME_EVENT_TITLE_RULE: true, SAME_EVENT_AI_CHOICE: true },
};

export interface RunInput {
  run: RunName;
  part: Part;
  // Whether the Place setting holds for evaluation B's reading, as evaluation A's run decided. Evaluation A's runs say it
  // by their name.
  placeNameIsGwanak: boolean;
  golds: GoldPost[];
  pairs: GoldPair[];
  saved: Map<string, SavedPost>;
  page: (post: string) => string;
  parsers: PostParsers;
  places: PlaceDto[];
  model: Model | null;
  prices: Prices;
  budgetUsd: number;
  limits: { timeoutMs: number; maxOutputTokens: number };
  calls: SavedCalls;
}

export type RunScore = { a: ScoreA } | { b: ScoreB };

export interface RunOutcome {
  score: RunScore | null;
  verdicts: Verdict[];
  // Why the run stopped before its end.
  stopped: string | null;
  calls: SavedCalls;
  usage: ReturnType<ModelCalls['usage']>;
  modelIds: string[];
}

// The posts the run reads: an evaluation's own, and for the run that asks, those of evaluation B too, so that B's three
// runs read one saved reading.
function postsOf({ run, golds, pairs }: RunInput): string[] {
  const inA = golds.map(({ post }) => post);
  const inB = pairs.flatMap(({ a, b }) => [a.post, b.post]);
  if (run === 'judgement') {
    return [...new Set([...inA, ...inB])];
  }
  return [...new Set(RUNS[run].evaluation === 'a' ? inA : inB)];
}

function readAll(input: RunInput, posts: string[]): ReadPost[] {
  return posts.map((post) => {
    const saved = input.saved.get(post);
    if (saved === undefined) {
      throw new Error(`${post} is not in posts.yaml`);
    }
    return readPost(saved, input.page(post), input.parsers, input.places);
  });
}

// The post's Judgement when it has sessions the rules left, one call each.
async function readings(input: RunInput, posts: ReadPost[], calls: ModelCalls): Promise<Map<string, PostReading>> {
  const spec = RUNS[input.run];
  const settings = {
    places: input.places,
    placeNameIsGwanak: 'place' in spec ? spec.place : input.placeNameIsGwanak,
  };
  const read = new Map<string, PostReading>();
  for (const post of posts) {
    // oxlint-disable-next-line no-await-in-loop -- one call at a time, so that the budget is checked between them
    const judgement = spec.judges && isJudged(post) ? await calls.judgement(post) : null;
    read.set(post.post, readingOf(post, judgement, settings));
  }
  return read;
}

async function scored(input: RunInput, read: Map<string, PostReading>, calls: ModelCalls): Promise<RunScore> {
  const spec = RUNS[input.run];
  if (spec.evaluation === 'a') {
    return { a: scoreA(input.golds, read) };
  }
  const mode: StepMode = spec.mode;
  return { b: await scoreB(input.pairs, read, mode, (post, question) => calls.sameEvent(post, question)) };
}

function idsOf({ judgements, choices }: SavedCalls): string[] {
  const ids = [...Object.values(judgements), ...Object.values(choices)].flatMap(({ modelId }) =>
    modelId === null ? [] : [modelId],
  );
  return [...new Set(ids)];
}

export async function runCollection(input: RunInput): Promise<RunOutcome> {
  const calls = new ModelCalls(
    {
      model: input.model,
      asksForJudgements: input.run === 'judgement',
      limits: input.limits,
      prices: input.prices,
      budgetUsd: input.budgetUsd,
    },
    input.calls,
  );
  const outcome = (score: RunScore | null, stopped: string | null): RunOutcome => {
    const saved = calls.saved();
    return {
      score,
      verdicts: score === null ? [] : verdictsOf(score),
      stopped,
      calls: saved,
      usage: calls.usage(),
      modelIds: idsOf(saved),
    };
  };
  try {
    const read = await readings(input, readAll(input, postsOf(input)), calls);
    return outcome(await scored(input, read, calls), null);
  } catch (error) {
    if (error instanceof BudgetSpentError) {
      return outcome(null, error.message);
    }
    throw error;
  }
}
