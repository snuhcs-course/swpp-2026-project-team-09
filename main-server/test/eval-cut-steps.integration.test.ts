/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Logger } from '@nestjs/common';
import { inject, type ProvidedContext } from 'vitest';
import { loadCases } from '../eval/cases.ts';
import { FALLBACK_PRICES } from '../eval/cost.ts';
import { type RunOptions } from '../eval/options.ts';
import { type EvalApp, runCase, startEvalApp } from '../eval/runner.ts';
import { seedWorld, type World } from '../eval/world.ts';
import { type SeededDatabase, seededDatabase } from './containers.js';
import { ScriptedModel } from './scripted-model.js';

// A step cut at the output limit (P05 ticket 10a): the trace keeps what it wrote, the server's logs do not, and the
// reply is what it would have been without the trace. The scripted model stands in for the real one.

const model = new ScriptedModel();

const OPTIONS: RunOptions = {
  model: 'test/model',
  temperature: null,
  topP: null,
  maxSteps: 3,
  timeoutMs: 30_000,
  maxOutputTokens: 321,
  repeat: null,
  categories: [],
  caseIds: [],
  budgetUsd: 5,
  world: 'small',
  prices: FALLBACK_PRICES,
  commit: 'abc1234',
};

const REASONING = '잘린 추론 3b7e';
const RAW_RESPONSE = { id: 'gen-1', choices: [{ finish_reason: 'length', message: { content: '' } }] };

let evalApp: EvalApp;
let world: World;
// The world lives in a database of its own, so that its Global Events, Quests and menus reach no other test.
let database: SeededDatabase<ProvidedContext['settings']>;

beforeAll(async () => {
  database = await seededDatabase(inject('settings'));
  evalApp = await startEvalApp(database.settings, model.model, OPTIONS);
  world = await seedWorld(evalApp.app, database.url);
});

afterAll(async () => {
  await evalApp.app.close();
  await database.drop();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function sample(): ReturnType<typeof loadCases>[number] {
  const found = loadCases().find(({ id }) => id === 'menus-today-lunch');
  if (found === undefined) {
    throw new Error('The sample case is missing');
  }
  return found;
}

// Everything written to the server's log from now on.
function captureLogs(): () => string {
  const spies = (['log', 'warn', 'error', 'debug', 'verbose', 'fatal'] as const).map((level) =>
    vi.spyOn(Logger.prototype, level),
  );
  return () => JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
}

describe('A step cut at the output limit', () => {
  it('with no text keeps its parts, reasoning tokens and raw response in the trace only, and stays 503', async () => {
    const logs = captureLogs();
    model.script(
      { tool: 'getMenus', input: { date: '2026-10-21' } },
      { cut: { reasoning: REASONING, reasoningTokens: 320, rawResponse: RAW_RESPONSE } },
    );

    const run = await runCase(evalApp, world, sample(), 1, OPTIONS);

    const [turn] = run.turns;
    expect(turn?.status).toBe(503);
    expect(turn?.reply).toBeNull();
    expect(turn?.steps[0]?.cut).toBeUndefined();
    expect(turn?.steps[1]).toMatchObject({
      finishReason: 'length',
      text: '',
      cut: {
        content: [{ type: 'reasoning', text: REASONING }],
        reasoningTokens: 320,
        rawResponse: RAW_RESPONSE,
      },
    });
    expect(JSON.stringify(turn?.errorBody)).not.toContain(REASONING);
    expect(logs()).not.toContain(REASONING);
    expect(logs()).not.toContain('gen-1');
  });

  it('with text answers with that text as before, and the trace keeps it', async () => {
    const logs = captureLogs();
    model.script({ cut: { text: '잘린 답이', reasoningTokens: 0, rawResponse: RAW_RESPONSE } });

    const run = await runCase(evalApp, world, sample(), 1, OPTIONS);

    const [turn] = run.turns;
    expect(turn?.status).toBe(200);
    expect(turn?.reply).toMatchObject({ text: '잘린 답이', cards: [], mapButtons: [], proposal: null });
    expect(turn?.steps[0]?.cut).toMatchObject({ content: [{ type: 'text', text: '잘린 답이' }], reasoningTokens: 0 });
    expect(logs()).not.toContain('잘린 답이');
  });
});
