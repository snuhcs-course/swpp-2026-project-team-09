/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { inject, type ProvidedContext } from 'vitest';
import { loadCases } from '../eval/cases.ts';
import { FALLBACK_PRICES } from '../eval/cost.ts';
import { type RunOptions } from '../eval/options.ts';
import { type EvalApp, runCase, startEvalApp } from '../eval/runner.ts';
import { seedWorld, type World } from '../eval/world.ts';
import { type SeededDatabase, seededDatabase } from './containers.js';
import { ScriptedModel } from './scripted-model.js';

// A tool call that its input schema refuses before the tool runs (P19 ticket 02, review of #108): the run observer
// hears of it at the step's end, so the trace shows the error rather than a call without a result. The scripted
// model stands in for the real one.

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
  prices: FALLBACK_PRICES,
  commit: 'abc1234',
};

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

describe('A tool call its input schema refuses', () => {
  it('is in the trace with its error', async () => {
    const sample = loadCases().find(({ id }) => id === 'menus-today-lunch');
    if (sample === undefined) {
      throw new Error('The sample case is missing');
    }
    model.script({ tool: 'getMenus', input: { date: '내일' } }, { text: '날짜를 다시 볼게요.' });

    const run = await runCase(evalApp, world, sample, 1, OPTIONS);

    const [call] = run.turns[0]?.steps[0]?.toolCalls ?? [];
    expect(call).toMatchObject({ name: 'getMenus', input: { date: '내일' } });
    expect(call?.result).toBeUndefined();
    expect(call?.error).toEqual(expect.stringMatching(/\S/u));
  });
});
