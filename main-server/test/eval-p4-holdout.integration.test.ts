/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { inject, type ProvidedContext } from 'vitest';
import { type CaseTurn, casesIn, type EvalCase, loadCases } from '../eval/cases.ts';
import { FALLBACK_PRICES } from '../eval/cost.ts';
import { type RunOptions } from '../eval/options.ts';
import { casesToRun } from '../eval/p4/holdout.ts';
import { seedP4World } from '../eval/p4/world.ts';
import { type EvalApp, runCase, startEvalApp } from '../eval/runner.ts';
import { type World } from '../eval/world.ts';
import { type SeededDatabase, seededDatabase } from './containers.js';
import { ScriptedModel } from './scripted-model.js';

// The P4 holdout through the runner, in the P4 world, with the scripted model in the real model's place: each case sends
// its new wording after its original's history, at its original's clock and as its asker.

const OPTIONS: RunOptions = {
  model: 'test/model',
  temperature: null,
  topP: null,
  maxSteps: 8,
  timeoutMs: 30_000,
  maxOutputTokens: 1000,
  repeat: null,
  categories: [],
  caseIds: [],
  budgetUsd: 5,
  world: 'p4',
  holdout: true,
  prices: FALLBACK_PRICES,
  commit: 'abc1234',
};

const originals = casesIn(loadCases(), 'p4');
const holdout = casesToRun(OPTIONS);

const model = new ScriptedModel();
let database: SeededDatabase<ProvidedContext['settings']>;
let evalApp: EvalApp;
let world: World;

beforeAll(async () => {
  database = await seededDatabase(inject('settings'));
  evalApp = await startEvalApp(database.settings, model.model, OPTIONS);
  world = await seedP4World(evalApp.app, database.url);
  evalApp.travel.bind(world.seeds);
});

afterAll(async () => {
  await evalApp.app.close();
  await database.drop();
});

function lastUser(turns: readonly CaseTurn[]): string {
  const last = turns.at(-1);
  return last !== undefined && 'user' in last ? last.user : '';
}

function originalOf({ id }: EvalCase): EvalCase | undefined {
  return originals.find((evalCase) => `holdout-${evalCase.id}` === id);
}

describe('A case of the holdout', () => {
  it.each(holdout.map((evalCase) => [evalCase.id, evalCase] as const))(
    '%s reaches the model in its own words and is scored by its original',
    async (_id, evalCase) => {
      model.script({ text: '…' });

      const run = await runCase(evalApp, world, evalCase, 1, OPTIONS);

      const sent = JSON.stringify(model.received().at(-1)?.prompt.at(-1));
      expect(run.turns[0]).toMatchObject({ status: 200, user: lastUser(evalCase.turns) });
      expect(sent).toContain(lastUser(evalCase.turns));
      expect(run.expect).toEqual(originalOf(evalCase)?.expect);
    },
  );
});
