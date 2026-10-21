/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { wrapLanguageModel } from 'ai';
import { randomUUID } from 'node:crypto';
import { inject } from 'vitest';
import { caseSchema, type EvalCase, loadCases } from '../eval/cases.ts';
import { FALLBACK_PRICES } from '../eval/cost.ts';
import { type RunOptions } from '../eval/options.ts';
import { type EvalApp, runCase, startEvalApp } from '../eval/runner.ts';
import { seedWorld, type World } from '../eval/world.ts';
import { ScriptedModel } from './scripted-model.js';

// The benchmark's runner (P19 ticket 01) with the scripted model in the real model's place, so that it never calls
// OpenRouter: what a turn's trace holds, how a failed turn is classified, the three kinds of case, and the run's
// hyperparameters reaching the model call and the limits.

const model = new ScriptedModel();

// The usage a provider reports, which the scripted model leaves out, on every call.
const USAGE = { inputTokens: 100, outputTokens: 10, cacheReadTokens: 40, cacheWriteTokens: 5 };

const reporting = wrapLanguageModel({
  model: model.model,
  middleware: {
    specificationVersion: 'v4',
    wrapGenerate: async ({ doGenerate }) => ({
      ...(await doGenerate()),
      usage: {
        inputTokens: { total: 100, noCache: 55, cacheRead: 40, cacheWrite: 5 },
        outputTokens: { total: 10, text: 10, reasoning: undefined },
      },
    }),
  },
});

const OPTIONS: RunOptions = {
  model: 'test/model',
  temperature: 0.3,
  topP: 0.9,
  maxSteps: 3,
  timeoutMs: 30_000,
  maxOutputTokens: 321,
  repeat: null,
  categories: [],
  caseIds: [],
  budgetUsd: 5,
  prices: FALLBACK_PRICES,
  commit: 'abc1234',
};

// The time per message of the app that times out.
const SHORT_TIMEOUT = { ...OPTIONS, timeoutMs: 300 };

let evalApp: EvalApp;
let shortApp: EvalApp;
let world: World;

beforeAll(async () => {
  evalApp = await startEvalApp(inject('settings'), reporting, OPTIONS);
  shortApp = await startEvalApp(inject('settings'), reporting, SHORT_TIMEOUT);
  world = await seedWorld(evalApp.app);
});

afterAll(async () => {
  await Promise.all([evalApp.app.close(), shortApp.app.close()]);
});

function sampleCase(): EvalCase {
  const found = loadCases().find(({ id }) => id === 'menus-today-lunch');
  if (found === undefined) {
    throw new Error('The sample case is missing');
  }
  return found;
}

const menus = { tool: 'getMenus', input: { date: '2026-10-21', meal: 'lunch' } };

describe("A turn's trace", () => {
  it("holds every step's tool calls with their inputs and results, the finish reason and the usage, then the reply", async () => {
    model.script(menus, { tool: 'showOnMap', input: { layer: 'dining' } }, { text: '오늘 점심은 제육볶음이에요.' });

    const run = await runCase(evalApp, world, sampleCase(), 1, OPTIONS);

    expect(run).toMatchObject({ id: 'menus-today-lunch', category: 'menus', kind: 'single', repetition: 1 });
    const [turn] = run.turns;
    expect(turn).toMatchObject({
      user: '오늘 점심 학식 뭐 나와?',
      status: 200,
      failure: null,
      reply: { text: '오늘 점심은 제육볶음이에요.', textLength: 15, mapButtons: ['dining'], cards: [], proposal: null },
    });
    expect(turn?.steps.map(({ finishReason, ended }) => [finishReason, ended])).toEqual([
      ['tool-calls', true],
      ['tool-calls', true],
      ['stop', true],
    ]);
    expect(turn?.steps.every(({ usage }) => JSON.stringify(usage) === JSON.stringify(USAGE))).toBe(true);
    expect(turn?.steps[0]?.toolCalls).toEqual([
      {
        id: 'call-1',
        name: 'getMenus',
        input: menus.input,
        result: {
          result: 'found',
          date: '2026-10-21',
          restaurants: [
            { name: '자하연식당', collectedAt: '2026-10-21T07:00:00+09:00', meals: [expect.anything()] },
            { name: '학생회관식당', collectedAt: '2026-10-21T07:00:00+09:00', meals: [expect.anything()] },
          ],
        },
      },
    ]);
    expect(turn?.steps[1]?.toolCalls[0]).toMatchObject({ name: 'showOnMap', result: { result: 'shown' } });
    expect(turn?.steps[2]?.text).toBe('오늘 점심은 제육볶음이에요.');
  });

  it('is read on the clock fixed at 2026-10-21 14:05 in Korea', async () => {
    model.script({ text: '수요일이에요.' });

    await runCase(evalApp, world, sampleCase(), 1, OPTIONS);

    expect(model.system()).toContain('2026-10-21 Wednesday 14:05');
  });
});

describe("The run's hyperparameters", () => {
  it('reach the model call: the sampling through the wrapper, the output tokens through the settings', async () => {
    model.script({ text: '네' });

    await runCase(evalApp, world, sampleCase(), 1, OPTIONS);

    expect(model.received()[0]).toMatchObject({ temperature: 0.3, topP: 0.9, maxOutputTokens: 321 });
  });

  it('leave the sampling to the provider when not given', async () => {
    const plain = await startEvalApp(inject('settings'), model.model, { ...OPTIONS, temperature: null, topP: null });
    try {
      model.script({ text: '네' });

      await runCase(plain, world, sampleCase(), 1, OPTIONS);

      expect(model.received()[0]?.temperature).toBeUndefined();
      expect(model.received()[0]?.topP).toBeUndefined();
    } finally {
      await plain.app.close();
    }
  });
});

describe('A failed turn', () => {
  it("is STEP_LIMIT when the step cap ends on tool calls, and keeps its last step's tool results", async () => {
    model.script(menus, menus, menus, menus);

    const [turn] = (await runCase(evalApp, world, sampleCase(), 1, OPTIONS)).turns;

    expect(turn).toMatchObject({ status: 503, failure: 'STEP_LIMIT', reply: null });
    expect(model.received()).toHaveLength(3);
    expect(turn?.steps).toHaveLength(3);
    expect(turn?.steps[2]?.toolCalls[0]?.result).toMatchObject({ result: 'found', date: '2026-10-21' });
  });

  it('is TIMEOUT when the time per message runs out', async () => {
    model.script({ stall: true });

    const [turn] = (await runCase(shortApp, world, sampleCase(), 1, SHORT_TIMEOUT)).turns;

    expect(turn).toMatchObject({ status: 503, failure: 'TIMEOUT' });
    expect(turn?.steps[0]?.error).toBe('TimeoutError');
  });

  it('is ERROR when the model fails', async () => {
    model.script({ error: new Error('The provider failed') });

    const [turn] = (await runCase(evalApp, world, sampleCase(), 1, OPTIONS)).turns;

    expect(turn).toMatchObject({ status: 503, failure: 'ERROR', steps: [{ error: 'Error', finishReason: null }] });
  });
});

// A follow-up on a Proposal, after a card was shown.
const history = caseSchema.parse({
  id: 'history-sample',
  category: 'follow-ups',
  turns: [
    { user: '내일 점심 학생회관에서 이민수랑 밥 약속 잡아줘' },
    {
      assistant: {
        text: '이렇게 만들어 볼까요?',
        cards: [{ kind: 'quest', seed: '농구 파티' }],
        proposal: {
          title: '점심 약속',
          description: '학생회관에서 점심',
          joinPolicy: 'closed',
          board: null,
          capacity: 2,
          startsAt: '2026-10-22T12:00:00+09:00',
          place: '학생회관',
          invitees: ['이민수'],
        },
      },
    },
    { user: '7시로 바꿔줘' },
  ],
});

describe('A case with a fixed history', () => {
  it('sends the earlier turns as the app would, seed names turned into ids, and runs only the last', async () => {
    const [quest, place, friend] = [randomUUID(), randomUUID(), randomUUID()];
    const seeded: World = {
      ...world,
      seeds: {
        '농구 파티': { kind: 'quest', id: quest, name: '농구 파티' },
        학생회관: { kind: 'place', id: place, name: '학생회관' },
        이민수: { kind: 'friend', id: friend, name: '이민수' },
      },
    };
    model.script({ text: '네' });

    const run = await runCase(evalApp, seeded, history, 1, OPTIONS);

    expect(run.kind).toBe('history');
    expect(run.turns).toHaveLength(1);
    expect(run.turns[0]).toMatchObject({ user: '7시로 바꿔줘', status: 200 });
    const prompt = model.received()[0]?.prompt.filter(({ role }) => role !== 'system') ?? [];
    expect(prompt.map(({ role }) => role)).toEqual(['user', 'assistant', 'user']);
    const sent = JSON.stringify(prompt[1]);
    expect(sent).toContain(`[Cards shown: quest ${quest}]`);
    expect(sent).toContain('[Proposal shown:');
    expect(sent).toContain(place);
    expect(sent).toContain(friend);
  });
});

describe('A live case', () => {
  const live = caseSchema.parse({
    id: 'live-sample',
    category: 'live',
    live: true,
    turns: [{ user: '안녕' }, { user: '오늘 점심 뭐야?' }],
  });

  it('sends every turn to the model, each with the real replies before it', async () => {
    model.script({ text: '안녕하세요!' }, { text: '제육볶음이에요.' });

    const run = await runCase(evalApp, world, live, 1, OPTIONS);

    expect(run.turns.map(({ user, reply }) => [user, reply?.text])).toEqual([
      ['안녕', '안녕하세요!'],
      ['오늘 점심 뭐야?', '제육볶음이에요.'],
    ]);
    const prompt = model.received()[1]?.prompt.filter(({ role }) => role !== 'system') ?? [];
    expect(prompt).toEqual([
      { role: 'user', content: [{ type: 'text', text: '안녕' }] },
      { role: 'assistant', content: [{ type: 'text', text: '안녕하세요!' }] },
      { role: 'user', content: [{ type: 'text', text: '오늘 점심 뭐야?' }] },
    ]);
  });

  it('stops at the first turn that failed', async () => {
    model.script({ error: new Error('The provider failed') }, { text: '제육볶음이에요.' });

    const run = await runCase(evalApp, world, live, 1, OPTIONS);

    expect(run.turns.map(({ failure }) => failure)).toEqual(['ERROR']);
  });

  it('stops at the first turn the scorer does not pass', async () => {
    model.script({ text: '안녕하세요!' }, { text: '제육볶음이에요.' });

    const run = await runCase(evalApp, world, live, 1, OPTIONS, { passed: () => false });

    expect(run.turns).toHaveLength(1);
  });
});
