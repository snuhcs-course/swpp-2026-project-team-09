/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { inject, type ProvidedContext } from 'vitest';
import { type EvalCase, loadCases } from '../eval/cases.ts';
import { FALLBACK_PRICES } from '../eval/cost.ts';
import { type RunOptions } from '../eval/options.ts';
import { type EvalApp, requestMessages, runCase, startEvalApp } from '../eval/runner.ts';
import { seedWorld, type World } from '../eval/world.ts';
import { type SeededDatabase, seededDatabase } from './containers.js';
import { signInUser } from './friends.js';
import { ScriptedModel } from './scripted-model.js';

// What P4 added to a case (P04 ticket 03): its own time, its own asker and Restaurant cards in a fixed history, with the
// scripted model in the real model's place.

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

let evalApp: EvalApp;
let world: World;
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

function sampleCase(): EvalCase {
  const found = loadCases().find(({ id }) => id === 'menus-today-lunch');
  if (found === undefined) {
    throw new Error('The sample case is missing');
  }
  return found;
}

describe("A case's clock", () => {
  it('stands at the time the case gives, and goes back for the next', async () => {
    model.script({ text: '네' }, { text: '네' });

    await runCase(evalApp, world, { ...sampleCase(), now: '2026-10-22T09:30:00+09:00' }, 1, OPTIONS);
    expect(model.system()).toContain('2026-10-22 Thursday 09:30');

    model.script({ text: '네' });
    await runCase(evalApp, world, sampleCase(), 1, OPTIONS);
    expect(model.system()).toContain('2026-10-21 Wednesday 14:05');
  });
});

describe("A case's asker", () => {
  it('sends the message as the User the case names', async () => {
    const newcomer = await signInUser(evalApp.app);
    const asked = { ...world, askers: { 새내기: newcomer.accessToken } };
    model.script({ text: '네' });

    const run = await runCase(evalApp, asked, { ...sampleCase(), asker: '새내기' }, 1, OPTIONS);

    expect(run.turns[0]?.status).toBe(200);
  });

  it('must be one the world has', async () => {
    await expect(runCase(evalApp, world, { ...sampleCase(), asker: '새내기' }, 1, OPTIONS)).rejects.toThrow('새내기');
  });
});

describe('A Restaurant card in a fixed history', () => {
  it('is sent back by its key', () => {
    const seeded: World = {
      ...world,
      seeds: { 학생회관식당: { kind: 'restaurant', id: '학생회관식당', name: '학생회관식당' } },
    };

    const [sent] = requestMessages(
      [{ assistant: { text: '여기 어때요?', cards: [{ kind: 'restaurant', seed: '학생회관식당' }], proposal: null } }],
      seeded,
    );

    expect(sent).toMatchObject({ cards: [{ kind: 'restaurant', id: '학생회관식당' }] });
  });
});
