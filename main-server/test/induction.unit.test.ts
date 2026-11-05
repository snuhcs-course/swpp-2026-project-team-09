/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { audit, passes, promote, standingOf } from '../src/assistant/induction/gate.js';
import { HOLDOUT_PERCENT, instancesOf, split } from '../src/assistant/induction/instances.js';
import {
  type Candidate,
  dominates,
  paretoFront,
  sampleFront,
  sampleSome,
  seededRandom,
} from '../src/assistant/induction/pareto.js';
import { heldBack } from '../src/common/holdback.js';
import { instance, places, PREFIX, row, rule } from './induction-fixture.js';

// The induction of matching rules (P07 ticket 07) on hand-made Places, rows and rules: the instances, GEPA's Pareto
// front, the gate and the audit.

function verdicts(...correct: boolean[]): Candidate['verdicts'] {
  return correct.map((right) => ({ correct: right, answer: { result: 'none' as const, candidateIds: [] } }));
}

// Twenty draws from the front under the seed.
function drawn(front: Candidate[], seed: number): Candidate[] {
  const random = seededRandom(seed);
  return Array.from({ length: 20 }, () => sampleFront(front, random));
}

describe('Instances', () => {
  it('are each words and the Place its labels end at, with the accounts behind them', () => {
    const rows = [
      row({ userId: 'u1', words: '뷁학생회관', outcome: 'answered' }),
      row({ userId: 'u1', words: '뷁학생회관', outcome: 'chosen', chosenId: 'business', minute: 1 }),
      row({ userId: 'u1', words: '뷁학생회관', outcome: 'edited', chosenId: 'hall', minute: 2 }),
      row({ userId: 'u2', words: '뷁학생회관', outcome: 'answered', minute: 3 }),
      row({ userId: 'u2', words: '뷁학생회관', outcome: 'chosen', chosenId: 'hall', minute: 4 }),
      // Rejections alone teach nothing.
      row({ userId: 'u3', words: '뷁없', outcome: 'answered', minute: 5 }),
      row({ userId: 'u3', words: '뷁없', outcome: 'rejected', chosenId: 'hall', minute: 6 }),
      // An account 3 days old teaches nothing.
      row({ userId: 'u4', words: '뷁경영', outcome: 'answered', minute: 7, daysOld: 3 }),
      row({ userId: 'u4', words: '뷁경영', outcome: 'chosen', chosenId: 'business', minute: 8 }),
      // A label without an answered row before it teaches nothing.
      row({ userId: 'u5', words: '뷁자연', outcome: 'chosen', chosenId: 'science', minute: 9 }),
    ];

    const instances = instancesOf(rows);

    expect(instances).toEqual([
      {
        words: '뷁학생회관',
        placeId: 'hall',
        accounts: ['u1', 'u2'],
        eventIds: ['001', '002', '003', '004', '005'],
        heldOut: heldBack('뷁학생회관', HOLDOUT_PERCENT),
      },
    ]);
  });

  it('are split by the held-out mark', () => {
    const { train, heldOut } = split([instance('a', 'hall', []), instance('b', 'hall', [], true)]);
    expect(train.map(({ words }) => words)).toEqual(['a']);
    expect(heldOut.map(({ words }) => words)).toEqual(['b']);
  });
});

describe('The Pareto front', () => {
  const root: Candidate = { rules: [], verdicts: verdicts(false, false, false) };
  const a: Candidate = { rules: [PREFIX], verdicts: verdicts(true, false, false) };
  const b: Candidate = { rules: [PREFIX, PREFIX], verdicts: verdicts(true, true, false) };
  const c: Candidate = { rules: [PREFIX], verdicts: verdicts(false, false, true) };

  it('keeps a candidate right on an instance no other is right on, and drops a dominated one', () => {
    expect(dominates(b, a)).toBe(true);
    expect(dominates(a, b)).toBe(false);
    expect(dominates(b, c)).toBe(false);
    expect(paretoFront([root, a, b, c])).toEqual([b, c]);
    expect(paretoFront([root])).toEqual([root]);
  });

  it('samples by how many instances each is right on, the same under one seed', () => {
    expect(drawn([b, c], 7)).toEqual(drawn([b, c], 7));
    expect(drawn([b, c], 7).filter((candidate) => candidate === b).length).toBeGreaterThan(10);
    expect(sampleSome([1, 2, 3, 4, 5], 3, seededRandom(1))).toHaveLength(3);
    expect(new Set(sampleSome([1, 2, 3, 4, 5], 5, seededRandom(1)))).toEqual(new Set([1, 2, 3, 4, 5]));
  });
});

describe('The gate', () => {
  const train = [
    instance('뷁학생회관', 'hall', ['u1', 'u2']),
    instance('뷁경영대학', 'business', ['u3']),
    instance('경영대학', 'business', ['u4']),
    instance('자대', 'science', ['u6']),
  ];
  const heldOut = [instance('뷁자연과학대학', 'science', ['u5'], true), instance('자대', 'science', ['u7'], true)];

  it('passes a rule fixing two words of two accounts that breaks nothing, the held-out words counting', async () => {
    const standing = await standingOf(places, [], PREFIX, train, heldOut);
    expect(standing).toMatchObject({ fixed: 3, broke: 0, accounts: 4, heldOutGain: 1, example: '뷁학생회관' });
    expect(passes(standing)).toBe(true);
  });

  it('refuses a rule fixing one words, or two words of one account', async () => {
    const one = await standingOf(places, [], rule('words', '^뷁경영(.+)$', '경영$1'), train, heldOut);
    expect(one).toMatchObject({ fixed: 1, accounts: 1 });
    expect(passes(one)).toBe(false);
    const oneAccount = await standingOf(
      places,
      [],
      PREFIX,
      [instance('뷁학생회관', 'hall', ['u1']), instance('뷁경영대학', 'business', ['u1'])],
      [],
    );
    expect(oneAccount).toMatchObject({ fixed: 2, accounts: 1 });
    expect(passes(oneAccount)).toBe(false);
  });

  it('refuses a rule that breaks a right instance or loses on the held-out words', async () => {
    const breaking = await standingOf(places, [], rule('words', '^자대$', '학생회관'), train, heldOut);
    expect(breaking).toMatchObject({ fixed: 0, broke: 2, heldOutGain: -1 });
    expect(passes(breaking)).toBe(false);
  });

  it('promotes the rules one at a time, and the audit retires one the set is as good without', async () => {
    const useless = rule('words', '^없$', '학생회관');
    const subsumed = rule('words', '^뷁학생(.+)$', '학생$1');
    const { promoted, refused } = await promote(places, [], [PREFIX, useless], train, heldOut);
    expect(promoted.map(({ rule: { id } }) => id)).toEqual([PREFIX.id]);
    expect(refused.map(({ rule: { id } }) => id)).toEqual([useless.id]);
    const { kept, retired } = await audit(places, [PREFIX, subsumed], train, heldOut);
    expect(kept.map(({ rule: { id } }) => id)).toEqual([PREFIX.id]);
    expect(retired.map(({ rule: { id } }) => id)).toEqual([subsumed.id]);
  });
});
