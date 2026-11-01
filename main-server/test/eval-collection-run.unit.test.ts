/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { MockLanguageModelV4 } from 'ai/test';
import { type GoldPair, type GoldPost, type SavedPost } from '../eval/collection/gold.ts';
import { reportOf } from '../eval/collection/report.ts';
import { type RunInput, type RunName, runCollection } from '../eval/collection/run.ts';
import { judgementAnswerSchema } from '../src/global-events/judgement-answer.js';
import { type PlaceDto } from '../src/places/dto/place.dto.js';
import { ScriptedModel } from './scripted-model.js';

// A whole run with the model scripted and the worker's parser standing in, over posts the sets do not hold.

const PLACES: PlaceDto[] = [{ id: 'p-301', name: '제1공학관', number: '301', latitude: 0, longitude: 0 }];

const NOW = new Date('2026-10-31T00:00:00Z');

function saved(post: string, source: SavedPost['source'], key: string): SavedPost {
  return { post, source, key, fetchedAt: NOW };
}

const SAVED = new Map([
  ['snu-1', saved('snu-1', 'snu_events', '1')],
  ['snu-2', saved('snu-2', 'snu_events', '2')],
  ['extra-PGM1', saved('extra-PGM1', 'extra_snu', 'PGM1')],
]);

const TIME = '일시: 2026. 11. 2.(월) 14:00~15:00';

function collected(key: string, written: string, place: string | null, read: boolean, title: string): object {
  return {
    key,
    address: `https://example.com/${key}`,
    title,
    description: `${TIME}\n장소: ${written}\n문의: someone@snu.ac.kr`,
    links: [],
    sessions: [
      {
        number: 1,
        start: read ? '2026-11-02T14:00:00+09:00' : null,
        end: read ? '2026-11-02T15:00:00+09:00' : null,
        readFrom: read ? 'body' : null,
        place,
      },
    ],
  };
}

const PARSED: Record<string, object> = {
  1: collected('1', '서울대학교 301동', null, false, '특강'),
  2: collected('2', '서울대학교 301동', '서울대학교 301동', true, '특강'),
  PGM1: collected('PGM1', '서울대학교 제1공학관 117호', null, false, '다른 이름의 특강'),
};

const parsers = {
  snuEvents: (_html: string, key: string): object => PARSED[key] ?? {},
  extraSnu: (_html: string, key: string): object => PARSED[key] ?? {},
};

const GOLDS: GoldPost[] = [
  {
    id: 'a-1',
    post: 'snu-1',
    announcesEvent: true,
    sessions: [
      {
        n: 1,
        start: '2026-11-02T14:00',
        end: '2026-11-02T15:00',
        placeId: 'p-301',
        overPeriod: false,
        mayPublish: true,
      },
    ],
  },
];

const PAIRS: GoldPair[] = [
  {
    id: 'b-1',
    a: { post: 'snu-2', session: null },
    b: { post: 'extra-PGM1', session: null },
    chosenAs: 'different-title',
    sameEvent: true,
  },
];

function judgementAnswer(place: string): string {
  const line = TIME;
  return JSON.stringify({
    announcesEvent: true,
    sessions: [
      {
        start: '2026-11-02T14:00',
        end: '2026-11-02T15:00',
        place,
        overPeriod: false,
        lines: { start: [line], end: [line], place: [`장소: ${place}`] },
      },
    ],
  });
}

function input(run: RunName, changes: Partial<RunInput> = {}): RunInput {
  return {
    run,
    part: 'development',
    golds: GOLDS,
    pairs: PAIRS,
    saved: SAVED,
    page: () => '<html></html>',
    parsers,
    places: PLACES,
    model: null,
    prices: { input: 1e-7, output: 5e-7, cacheRead: 1e-8, cacheWrite: 1e-7, source: 'openrouter' },
    budgetUsd: 1,
    limits: { timeoutMs: 1000, maxOutputTokens: 500 },
    calls: { judgements: {}, choices: {} },
    ...changes,
  };
}

const RECORD = {
  run: 'r0a' as const,
  command: 'pnpm eval:collection --run r0a',
  commit: 'abc',
  c0Tag: 'tag',
  isDescendantOfC0: true,
  setHash: 'hash',
  thresholdsBlob: 'blob',
  startedAt: 'start',
  endedAt: 'end',
  part: 'development',
  modelAsked: 'model',
  canonicalSlug: 'model-1',
  modelsAnswered: [],
  limits: { timeoutMs: 1, maxOutputTokens: 1 },
  switches: {},
  buildingNumberIsGwanak: { snu_events: true },
  checks: ['announcesEvent'],
  from: null,
  usage: { calls: 0, tokens: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, costUsd: 0 },
  budgetUsd: 1,
  pricesSource: 'openrouter',
};

describe('a run of evaluation A', () => {
  it('reads only what the rules read in R0, with no call', async () => {
    const outcome = await runCollection(input('r0a'));
    expect(outcome.usage.calls).toBe(0);
    expect(outcome.score).toMatchObject({ a: { c1: { k: 0, n: 1 }, c2: { k: 0, n: 0 } } });
    expect(outcome.verdicts.find(({ id }) => id === 'c1.floor')?.result).toBe('FAIL');
  });

  it('publishes what a Judgement passes, masks the post, and judges the posts of B too', async () => {
    const model = new ScriptedModel();
    model.script(
      { text: judgementAnswer('서울대학교 301동') },
      { text: judgementAnswer('서울대학교 제1공학관 117호') },
    );
    const outcome = await runCollection(input('judgement', { model: model.model }));
    expect(outcome.usage.calls).toBe(2);
    expect(outcome.score).toMatchObject({ a: { c1: { k: 1, n: 1 }, c2: { k: 0, n: 1 } } });
    expect(JSON.stringify(model.received()[0]?.prompt)).toContain('[이메일]');
    expect(JSON.stringify(model.received())).not.toContain('someone@snu.ac.kr');
    expect(Object.keys(outcome.calls.judgements).toSorted()).toEqual(['extra-PGM1', 'snu-1']);
  });

  it('keeps a failed call as no answer, publishing nothing', async () => {
    const model = new ScriptedModel();
    model.script({ error: new Error('down') }, { error: new Error('down') });
    const outcome = await runCollection(input('judgement', { model: model.model }));
    expect(outcome.score).toMatchObject({ a: { c1: { k: 0, n: 1 }, c4: { failedCalls: 1 } } });
    expect(outcome.calls.judgements['snu-1']?.answer).toBeNull();
  });

  it('stops at its budget, keeping what it has', async () => {
    const model = new MockLanguageModelV4({
      doGenerate: {
        content: [{ type: 'text', text: judgementAnswer('서울대학교 301동') }],
        finishReason: { unified: 'stop', raw: undefined },
        usage: {
          inputTokens: { total: 1_000_000, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: 0, text: undefined, reasoning: undefined },
        },
        warnings: [],
      },
    });
    const outcome = await runCollection(input('judgement', { model, budgetUsd: 0.01 }));
    expect(outcome.stopped).toMatch(/budget/u);
    expect(outcome.score).toBeNull();
    expect(outcome.usage.calls).toBe(1);
    expect(Object.keys(outcome.calls.judgements)).toEqual(['snu-1']);
  });
});

describe('saved answers', () => {
  const SAVED_ANSWERS = {
    judgements: Object.fromEntries(
      ['snu-1', 'extra-PGM1'].map((post) => [
        post,
        {
          answer: judgementAnswerSchema.parse(JSON.parse(judgementAnswer('서울대학교 301동'))),
          failure: null,
          modelId: 'm',
        },
      ]),
    ),
    choices: {},
  };

  it('are read again with no model', async () => {
    const outcome = await runCollection(input('judgement', { calls: SAVED_ANSWERS }));
    expect(outcome.usage.calls).toBe(0);
    expect(outcome.score).toMatchObject({ a: { c1: { k: 1, n: 1 } } });
  });

  it('refuses a run with no answer to read and no model', async () => {
    await expect(runCollection(input('r0b'))).rejects.toThrow(/no saved run gives/u);
  });

  it('never asks for a Judgement in the AI run, even with a model', async () => {
    const model = new ScriptedModel();
    model.script();
    await expect(runCollection(input('ai-choice', { model: model.model }))).rejects.toThrow(
      /may not ask for a Judgement/u,
    );
    expect(model.received()).toEqual([]);
  });
});

describe('a run of evaluation B', () => {
  const READING = {
    judgements: {
      'extra-PGM1': {
        answer: judgementAnswerSchema.parse(JSON.parse(judgementAnswer('서울대학교 제1공학관 117호'))),
        failure: null,
        modelId: 'm',
      },
    },
    choices: {},
  };

  it('reads the saved reading', async () => {
    const outcome = await runCollection(input('title-rule', { calls: READING }));
    expect(outcome.usage.calls).toBe(0);
    expect(outcome.score).toMatchObject({ b: { d3: { k: 1, n: 1 } } });
  });

  it('asks the AI in its own run, and saves the answer for a later one', async () => {
    const model = new ScriptedModel();
    model.script({
      text: JSON.stringify({ sessions: [{ session: 1, answer: 'same', candidate: 1, reason: '같음' }] }),
    });
    const outcome = await runCollection(input('ai-choice', { model: model.model, calls: READING }));
    expect(outcome.usage.calls).toBe(1);
    expect(outcome.score).toMatchObject({ b: { d6: { k: 1, n: 1 }, d1: 0 } });
    const again = await runCollection(input('ai-choice', { calls: outcome.calls }));
    expect(again.usage.calls).toBe(0);
    expect(again.score).toMatchObject({ b: { d6: { k: 1, n: 1 } } });
  });
});

describe('the record of a run', () => {
  it('holds what the metrics document asks of it, and its failure rows', async () => {
    const outcome = await runCollection(input('r0a'));
    const report = reportOf(RECORD, outcome);
    for (const expected of [
      'pnpm eval:collection --run r0a',
      'abc',
      'model-1',
      'c1.floor',
      '0/1',
      'a-1 (1)',
      'USD 0.0000',
    ]) {
      expect(report).toContain(expected);
    }
  });

  it('says a run that stopped did not end', () => {
    const report = reportOf(RECORD, {
      score: null,
      verdicts: [],
      stopped: 'The budget of USD 1 is spent',
      calls: { judgements: {}, choices: {} },
      usage: RECORD.usage,
      modelIds: [],
    });
    expect(report).toContain('끝까지 돌지 못했습니다');
  });
});
