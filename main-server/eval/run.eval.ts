/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { fileURLToPath } from 'node:url';
import { inject } from 'vitest';
import { openRouterModel } from '../src/assistant/adapter.js';
import { loadCases, repetitionsOf, selectCases, sentTurnsOf } from './cases.ts';
import { dotEnv, runOptionsFromEnv } from './options.ts';
import { expectSchema } from './expect.ts';
import { namesOf } from './normalise.ts';
import { type EvalApp, runCase, RunLog, startEvalApp } from './runner.ts';
import { scoreTurn } from './score.ts';
import { saveScorecard } from './scorecard.ts';
import { seedWorld, type World } from './world.ts';

// The benchmark run against the real model, which `pnpm eval` starts with its options (eval/cli.ts). Each case run
// is one test, which passes once its turns are recorded: the scorer (eval/score.ts) judges them, and stops a live
// case at its first failed turn. The run is saved when it ends, stopped by the budget or not, with its scorecard
// beside it.

const options = runOptionsFromEnv();
const cases = selectCases(loadCases(), options.categories, options.caseIds);
const log = new RunLog(options);
// The app and its world, once started.
const started: { evalApp?: EvalApp; world?: World } = {};

beforeAll(async () => {
  // The team's OpenRouter key, from main-server/.env. Never printed.
  const key = dotEnv().OPENROUTER_API_KEY ?? '';
  if (key === '') {
    throw new Error('Set OPENROUTER_API_KEY in main-server/.env');
  }
  started.evalApp = await startEvalApp(
    { ...inject('settings'), OPENROUTER_API_KEY: key },
    openRouterModel(key, options.model),
    options,
  );
  started.world = await seedWorld(started.evalApp.app);
  log.seeds = started.world.seeds;
});

afterAll(async () => {
  if (log.cases.length > 0) {
    const file = log.save();
    console.log(`The run is saved in ${fileURLToPath(file)}, at an estimated USD ${log.costUsd().toFixed(4)}`);
    console.log(`Its scorecard is ${fileURLToPath(saveScorecard(file))}`);
  }
  await started.evalApp?.app.close();
});

// Each run of each case, the repeated set's several times.
const runs = cases.flatMap((evalCase) => {
  const repetitions = repetitionsOf(evalCase, options.repeat);
  return Array.from({ length: repetitions }, (_, index) => ({
    evalCase,
    repetition: index + 1,
    name: repetitions === 1 ? evalCase.id : `${evalCase.id} (${index + 1}/${repetitions})`,
  }));
});

for (const { evalCase, repetition, name } of runs) {
  it(
    name,
    async ({ skip }) => {
      const { evalApp, world } = started;
      if (evalApp === undefined || world === undefined) {
        throw new Error('The app did not start');
      }
      if (log.overBudget()) {
        skip(`The budget of USD ${options.budgetUsd} is spent`);
      }
      log.add(
        await runCase(evalApp, world, evalCase, repetition, options, {
          // A live turn with no expectation of its own goes on.
          passed: (turn, expect) =>
            expect === null || scoreTurn(turn, expectSchema.parse(expect), namesOf(world.seeds)).passed,
          turnEnded: (turn) => {
            log.countTurn(turn);
          },
          stop: () => log.overBudget(),
        }),
      );
    },
    // Each turn may take its whole time, and the database a little more.
    sentTurnsOf(evalCase) * (options.timeoutMs + 30_000),
  );
}
