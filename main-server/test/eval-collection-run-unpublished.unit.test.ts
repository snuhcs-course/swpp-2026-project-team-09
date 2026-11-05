/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type GoldPair } from '../eval/collection/gold.ts';
import { runCollection } from '../eval/collection/run.ts';
import { judgementAnswerSchema } from '../src/global-events/judgement-answer.js';
import { input, judgementAnswer, PAIRS } from './eval-collection-runs.js';
import { ScriptedModel } from './scripted-model.js';

// What a run keeps of what is not published: the raw text of a Judgement that fails the schema, and the sessions the
// step compares though it would not publish them.

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

describe('a run of evaluation A', () => {
  it('saves the raw text of an answer that fails the schema, and nothing for a failed call', async () => {
    const model = new ScriptedModel();
    model.script({ text: '오후 두 시쯤일 것 같습니다' }, { error: new Error('down') });
    const outcome = await runCollection(input('judgement', { model: model.model }));
    expect(outcome.calls.judgements['snu-1']).toMatchObject({
      answer: null,
      failure: 'AI_NoObjectGeneratedError',
      rawText: '오후 두 시쯤일 것 같습니다',
    });
    expect(outcome.calls.judgements['extra-PGM1']).toMatchObject({ answer: null, rawText: null });
  });
});

describe('a run of evaluation B', () => {
  it("compares a session whose place names no Place, by the step's own verdict", async () => {
    const unplaced = {
      judgements: {
        ...READING.judgements,
        'snu-1': {
          answer: judgementAnswerSchema.parse(JSON.parse(judgementAnswer('서울대학교'))),
          failure: null,
          modelId: 'm',
        },
      },
      choices: {},
    };
    const pairs: GoldPair[] = [{ ...PAIRS[0], a: { post: 'snu-1', session: null } }];
    const model = new ScriptedModel();
    model.script({
      text: JSON.stringify({ sessions: [{ session: 1, answer: 'different', candidate: null, reason: '다름' }] }),
    });
    const outcome = await runCollection(input('ai-choice', { model: model.model, calls: unplaced, pairs }));
    // A session that would be published is its own on "different"; this one waits for an Administrator.
    expect(outcome.score).toMatchObject({ b: { d3: { k: 1, n: 1 }, d4: { byHold: { place_unchecked: 1 } } } });
    expect(JSON.stringify(model.received()[0]?.prompt)).toContain('place: 서울대학교,');
  });

  it('stops a replay with no model at a session whose choice was never saved', async () => {
    const before = { ...READING, choices: { 'snu-1': { choices: [], modelId: 'm' } } };
    const unplaced = {
      ...before,
      judgements: {
        ...READING.judgements,
        'snu-1': {
          answer: judgementAnswerSchema.parse(JSON.parse(judgementAnswer('서울대학교'))),
          failure: null,
          modelId: 'm',
        },
      },
    };
    const pairs: GoldPair[] = [{ ...PAIRS[0], a: { post: 'snu-1', session: null } }];
    await expect(runCollection(input('ai-choice', { calls: unplaced, pairs }))).rejects.toThrow(/no saved run gives/u);
  });
});
