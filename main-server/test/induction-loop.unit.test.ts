/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { induce } from '../src/assistant/induction/induction.js';
import { HOLDOUT_PERCENT, type Instance } from '../src/assistant/induction/instances.js';
import { evolve } from '../src/assistant/induction/loop.js';
import { type Proposal, promptOf, proposalsOf } from '../src/assistant/induction/reflector.js';
import { heldBack } from '../src/common/holdback.js';
import { instance, places, PREFIX, proposal, row, ScriptedReflector } from './induction-fixture.js';

// GEPA's loop over rule sets (P07 ticket 07) with a scripted reflector, the reflector's prompt and parsing, and one
// induction end to end, on the hand-made Places.

// The best candidate's patterns and the minibatches of a run under seed 3.
async function evolvedPatterns(train: Instance[], answers: Proposal[][]): Promise<string[]> {
  const evolution = await evolve({
    places,
    instances: train,
    root: [],
    reflector: new ScriptedReflector(answers),
    budget: 4,
    seed: 3,
  });
  return [
    ...evolution.best.rules.map(({ pattern }) => pattern),
    ...evolution.attempts.flatMap(({ minibatch }) => minibatch),
  ];
}

describe('The loop', () => {
  const train = [instance('뷁학생회관', 'hall', ['u1', 'u2']), instance('뷁경영대학', 'business', ['u3'])];

  it('keeps a child that beats its parent on the minibatch, records why the others are not, and stops when nothing fails', async () => {
    const reflector = new ScriptedReflector([
      [
        proposal('words', '(.)\\1', '$1'),
        proposal('name', '^(..)(.+)$', '$1'),
        proposal('words', '^없(.+)$', '$1'),
        proposal('words', '^뷁(.+)$', '$1'),
        proposal('words', '^뷁(.+)$', '$1'),
      ],
      [proposal('words', '^뷁(.+)$', '$1'), proposal('words', '^뷁(.+)$', '$1')],
    ]);

    const evolution = await evolve({ places, instances: train, root: [], reflector, budget: 5, seed: 1 });

    // The first call's fourth proposal fixes everything, so no second call is made.
    expect(evolution.attempts.map(({ proposals }) => proposals.map(({ outcome }) => outcome))).toEqual([
      [
        'refused: pattern not allowed',
        'refused: fits too many names',
        'dropped: no gain on the minibatch',
        'kept',
        'dropped: already tried',
      ],
    ]);
    expect(evolution.candidates).toBe(2);
    expect(evolution.best.rules.map(({ pattern }) => pattern)).toEqual(['^뷁(.+)$']);
    expect(reflector.calls[0]?.failures.map(({ words, expected }) => [words, expected.name])).toEqual([
      ['뷁학생회관', '학생회관'],
      ['뷁경영대학', '경영대학'],
    ]);
  });

  it('grows the best candidate from its parent across calls, the same under one seed', async () => {
    const answers = [[proposal('words', '^뷁경영(.+)$', '경영$1')], [proposal('words', '^뷁(.+)$', '$1')]];
    const first = await evolvedPatterns(train, answers);
    expect(first).toEqual(await evolvedPatterns(train, answers));
    // The second call's parent is the first call's child, so the child of both carries both rules; the gate's audit
    // retires the first (gate.ts). After the patterns, the minibatch of each call.
    expect(first).toEqual(['^뷁경영(.+)$', '^뷁(.+)$', '뷁학생회관', '뷁경영대학', '뷁학생회관']);
  });
});

describe('The reflector', () => {
  it('reads the rules out of the text, drops what does not fit, and says what was wrong', () => {
    expect(
      proposalsOf('Sure: {"rules":[{"kind":"words","pattern":"^윗(.+)$","replace":"상부$1","why":"x"}]} done'),
    ).toEqual({ proposals: [{ kind: 'words', pattern: '^윗(.+)$', replace: '상부$1', why: 'x' }], note: null });
    expect(proposalsOf('{"rules":[{"kind":"place","pattern":"a","replace":"b"}]}')).toEqual({
      proposals: [],
      note: '1 of the rules had not the shape asked for',
    });
    expect(proposalsOf('no rules')).toEqual({ proposals: [], note: 'no JSON object in 8 characters' });
    expect(proposalsOf('{"rules": [}')).toEqual({ proposals: [], note: 'the JSON does not parse' });
    expect(proposalsOf('{"items": []}')).toEqual({ proposals: [], note: 'the JSON has no rules list' });
  });

  it('tells the model the words, the Place meant with its forms, the answer and the rules in force', () => {
    const prompt = promptOf(
      [
        {
          words: '뷁학생회관',
          expected: { name: '학생회관', forms: ['학관'] },
          answer: { result: 'several', names: ['a', 'b'] },
        },
      ],
      [PREFIX],
    );
    expect(prompt).toContain('words "뷁학생회관" meant 학생회관 (forms the generator makes: 학관)');
    expect(prompt).toContain('a question among a, b');
    expect(prompt).toContain('- words: ^뷁(.+)$ → $1');
    expect(prompt).toContain('Rules tried before that did not help:\n(none)');
  });
});

describe('An induction', () => {
  it('promotes what the loop found and the gate passed, and counts every rule in force', async () => {
    const rows = ['u1', 'u2'].flatMap((userId, index) => [
      row({ userId, words: '뷁학생회관', outcome: 'answered', minute: index * 10 }),
      row({ userId, words: '뷁학생회관', outcome: 'chosen', chosenId: 'hall', minute: index * 10 + 1 }),
      row({ userId, words: '뷁경영대학', outcome: 'answered', minute: index * 10 + 2 }),
      row({ userId, words: '뷁경영대학', outcome: 'chosen', chosenId: 'business', minute: index * 10 + 3 }),
    ]);
    const reflector = new ScriptedReflector([[proposal('words', '^뷁(.+)$', '$1')]]);

    const result = await induce({ places, rows, active: [], reflector, budget: 3, seed: 1 });

    const heldOut = [heldBack('뷁학생회관', HOLDOUT_PERCENT), heldBack('뷁경영대학', HOLDOUT_PERCENT)].filter(
      Boolean,
    ).length;
    expect(result.instances).toEqual({ train: 2 - heldOut, heldOut });
    if (heldOut === 0) {
      expect(result.promoted.map(({ rule: { pattern }, fixed, accounts }) => [pattern, fixed, accounts])).toEqual([
        ['^뷁(.+)$', 2, 2],
      ]);
      expect(result.kept).toHaveLength(1);
    }
  });
});
