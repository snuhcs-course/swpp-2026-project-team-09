/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { inject, type ProvidedContext } from 'vitest';
import { loadCases } from '../eval/cases.ts';
import { FALLBACK_PRICES } from '../eval/cost.ts';
import { type RunOptions } from '../eval/options.ts';
import { type EvalApp, runCase, startEvalApp } from '../eval/runner.ts';
import { seedWorld, type World } from '../eval/world.ts';
import { APPROVAL_LINE } from '../src/assistant/approval-line.js';
import { type SeededDatabase, seededDatabase } from './containers.js';
import { ScriptedModel } from './scripted-model.js';

// What a turn's trace keeps of the Approval line (P12, CD-2), with the scripted model in the real model's place: the
// model's own reply beside the reply the User saw, and whether the server added the line.

const model = new ScriptedModel();

const OPTIONS: RunOptions = {
  model: 'test/model',
  temperature: null,
  topP: null,
  maxSteps: 4,
  timeoutMs: 30_000,
  maxOutputTokens: 1000,
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
// The world lives in a database of its own, so that its Quests reach no other test.
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

// The trace of the last turn of a case asked in Korean, the model showing the world's Quests `names` and answering
// `text`.
async function replyOf(names: string[], text: string): Promise<unknown> {
  const asked = loadCases().find(({ id }) => id === 'menus-today-lunch');
  if (asked === undefined) {
    throw new Error('The sample case is missing');
  }
  model.script(
    { tool: 'searchRecruitingQuests', input: { from: '2026-10-24', to: '2026-10-24' } },
    { tool: 'showQuests', input: { ids: names.map((name) => world.seeds[name]?.id) } },
    { text },
  );
  return (await runCase(evalApp, world, asked, 1, OPTIONS)).turns.at(-1)?.reply;
}

describe("A turn's reply", () => {
  it("keeps the model's own text, and that the line was added, over an Approval Quest's card", async () => {
    expect(await replyOf(['주말 배드민턴'], '배드민턴 파티가 있어요.')).toMatchObject({
      text: `배드민턴 파티가 있어요.\n\n${APPROVAL_LINE.korean}`,
      modelText: '배드민턴 파티가 있어요.',
      approvalLine: true,
    });
  });

  it('keeps the same text, and that no line was added, over an Open Quest only', async () => {
    expect(await replyOf(['보드게임 모임'], '보드게임 파티가 있어요.')).toMatchObject({
      text: '보드게임 파티가 있어요.',
      modelText: '보드게임 파티가 있어요.',
      approvalLine: false,
    });
  });
});
