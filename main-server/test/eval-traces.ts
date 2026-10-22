/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type Expect, expectSchema } from '../eval/expect.ts';
import { namesOf } from '../eval/normalise.ts';
import { type CaseRun } from '../eval/runner.ts';
import { type FailureKind, type ToolCallTrace, type TurnTrace } from '../eval/trace.ts';

// Hand-made traces for the benchmark's scorer tests (P19 ticket 02): turns, tool calls, case runs and saved runs as
// the runner records them, without the app or a model.

export const PLACE = '0b0e3f5e-0000-4000-8000-000000000001';
export const FRIEND = '0b0e3f5e-0000-4000-8000-000000000002';
export const OTHER_FRIEND = '0b0e3f5e-0000-4000-8000-000000000003';
export const QUEST = '0b0e3f5e-0000-4000-8000-000000000005';

export const SEEDS = {
  학생회관: { kind: 'place', id: PLACE, name: '학생회관' },
  이민수: { kind: 'friend', id: FRIEND, name: '이민수' },
  김민수: { kind: 'friend', id: OTHER_FRIEND, name: '김민수' },
  '농구 파티': { kind: 'quest', id: QUEST, name: '농구 파티' },
};

export const names = namesOf(SEEDS);

let ids = 0;

// A tool call, with what it answered, or unfinished when no result is given.
export function call(name: string, input: unknown, result?: unknown): ToolCallTrace {
  ids += 1;
  return { id: String(ids), name, input, ...(result === undefined ? {} : { result }) };
}

export interface Turn {
  // The tool calls of each step; a last step without any writes the reply.
  steps?: ToolCallTrace[][];
  text?: string;
  // As the endpoint sends them: { kind: 'quest', quest: { id, title, … } }.
  cards?: { kind: string; [field: string]: unknown }[];
  mapButtons?: string[];
  proposal?: unknown;
  failure?: FailureKind;
}

// A turn's trace: each step 500 ms and 1000 tokens in, 400 of them read from the cache and 100 written, 50 out.
export function turn({
  steps = [],
  text = '',
  cards = [],
  mapButtons = [],
  proposal = null,
  failure,
}: Turn): TurnTrace {
  const traced = [...steps, []].map((toolCalls, index, all) => ({
    toolCalls,
    text: index === all.length - 1 ? text : '',
    finishReason: index === all.length - 1 ? 'stop' : 'tool-calls',
    usage: { inputTokens: 1000, outputTokens: 50, cacheReadTokens: 400, cacheWriteTokens: 100 },
    latencyMs: 500,
    ended: true,
  }));
  return {
    user: '질문',
    status: failure === undefined ? 200 : 503,
    latencyMs: 500 * traced.length,
    steps: traced,
    reply: failure === undefined ? { text, textLength: text.length, cards, mapButtons, proposal } : null,
    failure: failure ?? null,
    errorBody: null,
  };
}

export function expectOf(written: unknown): Expect {
  return expectSchema.parse(written);
}

export const menusFound = call('getMenus', { date: '2026-10-21', meal: 'lunch' }, { result: 'found', restaurants: [] });
export const diningShown = call('showOnMap', { layer: 'dining' }, { result: 'shown', layer: 'dining' });
export const minsuSeveral = call(
  'resolveFriend',
  { name: '민수' },
  { result: 'several', candidates: [{ id: FRIEND }, { id: OTHER_FRIEND }], more: false },
);
export const proposed = call('proposeQuest', {}, { result: 'proposed' });

// The reply's Proposal: dinner tomorrow at 학생회관 with 이민수.
export const proposal = {
  joinPolicy: 'closed',
  board: null,
  capacity: 2,
  startsAt: '2026-10-22T19:00:00+09:00',
  place: { id: PLACE, name: '학생회관' },
  globalEvent: null,
  invitees: [{ id: FRIEND, name: '이민수' }],
};

// The sample case's expectation: today's lunch menus and the dining button.
export const menusExpect = expectOf({
  actions: ['TOOL'],
  tools: { required: ['getMenus', 'showOnMap'], forbidden: ['proposeQuest'] },
  args: { getMenus: { date: '2026-10-21', meal: 'lunch' } },
  mapButtons: ['dining'],
  text: { mentions: ['제육볶음'] },
});

export const goodMenus = turn({
  steps: [[menusFound], [diningShown]],
  text: '제육볶음이에요.',
  mapButtons: ['dining'],
});
// Without the dining button.
export const badMenus = turn({ steps: [[menusFound]], text: '제육볶음이에요.' });

export function caseRun(changes: Partial<CaseRun> & Pick<CaseRun, 'turns'>): CaseRun {
  return {
    id: 'menus-today-lunch',
    category: 'menus',
    kind: 'single',
    repetition: 1,
    knownFailure: null,
    expect: menusExpect,
    turnExpects: [null],
    ...changes,
  };
}

// A run as the runner saves it, at USD 1 and 2 per million tokens in and out, the cache free.
export function savedRun(cases: CaseRun[]): unknown {
  return {
    name: 'run',
    options: {
      model: 'test/model',
      maxSteps: 8,
      timeoutMs: 30_000,
      prices: { input: 1e-6, output: 2e-6, cacheRead: 0, cacheWrite: 0, source: 'fallback' },
    },
    seeds: SEEDS,
    stoppedBy: null,
    cases,
  };
}
