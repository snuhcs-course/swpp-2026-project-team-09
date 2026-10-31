/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { p5Report, type Suite } from '../eval/p5/report.ts';
import { scoreRun } from '../eval/run-score.ts';
import { call, turn } from './eval-traces.ts';

// The P05 suite's numbers (P05 ticket 02), on hand-made runs. No app, no model.

const SEEDS = {
  가: { kind: 'quest', id: 'id-가', name: '가' },
  나: { kind: 'quest', id: 'id-나', name: '나' },
  다: { kind: 'quest', id: 'id-다', name: '다' },
};

const SUITE: Suite = {
  world: 'p5',
  tags: { L: ['s1'], E: ['s2'], J10: ['j1'] },
  thresholds: [
    { metric: 'E2', kind: 'floor', comparator: '>=', value: 0.7 },
    { metric: 'E5', kind: 'target', comparator: '=', value: 1 },
    { metric: 'E4', kind: 'target', comparator: '>=', value: 0.8 },
    { metric: 'J10', kind: 'floor', comparator: '<=', value: 0.1 },
  ],
};

const questCard = (name: string): { kind: string; quest: object } => ({
  kind: 'quest',
  quest: { id: `id-${name}`, title: name },
});

const showing = (names: string[], input: object = {}): ReturnType<typeof turn> =>
  turn({
    steps: [[call('searchRecruitingQuests', input, { result: 'found' })]],
    text: '찾았어요',
    cards: names.map((name) => questCard(name)),
  });

interface RunWritten {
  id: string;
  category?: string;
  seeds: string[];
  shown: ReturnType<typeof turn>;
  repetition?: number;
}

function runOf({ id, category = 'search', seeds, shown, repetition = 1 }: RunWritten): object {
  const expect = {
    actions: ['TOOL'],
    cards: [{ kind: 'quest', seeds, max: seeds.length }],
  };
  return {
    id,
    category,
    kind: 'single',
    repetition,
    knownFailure: null,
    expect,
    turnExpects: [null],
    turns: [shown],
  };
}

function report(runs: RunWritten[]): ReturnType<typeof p5Report> {
  const score = scoreRun({ name: 'run', seeds: SEEDS, options: { world: 'p5' }, cases: runs.map((run) => runOf(run)) });
  return p5Report(score, SUITE);
}

describe('The cards of a subset', () => {
  it('sum over the repetitions, with the mean over its cases beside them', () => {
    const { subsets } = report([
      { id: 's1', seeds: ['가', '나'], shown: showing(['가', '다']), repetition: 1 },
      { id: 's1', seeds: ['가', '나'], shown: showing(['가', '나']), repetition: 2 },
    ]);

    expect(subsets).toEqual([
      {
        subset: 'L',
        cases: 1,
        shown: 4,
        right: 3,
        expected: 4,
        meanPrecision: 0.75,
        meanRecall: 0.75,
        exact: { k: 1, n: 2 },
      },
    ]);
  });
});

describe('A threshold', () => {
  it('passes or fails on the runs tagged for it', () => {
    const { metrics } = report([
      { id: 's1', seeds: ['가', '나'], shown: showing(['가']) },
      { id: 's2', seeds: [], shown: showing([]) },
    ]);
    const e2 = metrics.find(({ metric }) => metric === 'E2');
    const e5 = metrics.find(({ metric }) => metric === 'E5');

    expect(e2).toMatchObject({ k: 1, n: 2, verdicts: [{ passed: false }] });
    expect(e5).toMatchObject({ k: 1, n: 1, verdicts: [{ passed: true }] });
  });

  it('is not measured when it has no runs, as E4 until the large world comes', () => {
    const { metrics } = report([{ id: 's1', seeds: ['가'], shown: showing(['가']) }]);

    expect(metrics.find(({ metric }) => metric === 'E4')).toMatchObject({ n: 0, verdicts: [{ passed: null }] });
  });
});

describe('J10', () => {
  const seeds = ['가', '나'];

  it('counts a run that missed a card with a condition the User did not state', () => {
    const { metrics } = report([
      { id: 'j1', category: 'join-or-recruit', seeds, shown: showing(['가'], { board: 'hobby' }) },
    ]);

    expect(metrics.find(({ metric }) => metric === 'J10')).toMatchObject({ k: 1, n: 1 });
  });

  it('does not count a run that missed one with no such condition, or searched the whole week', () => {
    const week = { from: '2026-11-02', to: '2026-11-08' };
    const { metrics } = report([
      { id: 'j1', category: 'join-or-recruit', seeds, shown: showing(['가']) },
      { id: 'j1', category: 'join-or-recruit', seeds, shown: showing(['가'], week), repetition: 2 },
    ]);

    expect(metrics.find(({ metric }) => metric === 'J10')).toMatchObject({ k: 0, n: 2 });
  });
});
