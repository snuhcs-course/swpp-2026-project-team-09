/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { compare } from '../eval/compare.ts';
import { LARGE_WORLD } from '../eval/p5/large-world/world-data.ts';
import { largeWorldSuite, p5Report, type Suite } from '../eval/p5/report.ts';
import { p5Section } from '../eval/p5/report-section.ts';
import { scoreRun } from '../eval/run-score.ts';
import { call, turn } from './eval-traces.ts';

// How a run of the large world is read and reported (P05 ticket 02b), with no app and no model.

// A run of the large world with one case of subset V, which showed the card it should.
function runOfLargeWorld(world_: string): ReturnType<typeof scoreRun> {
  const shown = turn({
    steps: [[call('searchRecruitingQuests', {}, { result: 'found' })]],
    text: '찾았어요',
    cards: [{ kind: 'quest', quest: { id: 'id-q', title: '제목' } }],
  });
  return scoreRun({
    name: world_,
    seeds: { q: { kind: 'quest', id: 'id-q', name: 'q' } },
    options: { world: world_ },
    cases: [
      {
        id: 'a-v-case',
        category: 'search',
        kind: 'single',
        repetition: 1,
        knownFailure: null,
        expect: { actions: ['TOOL'], cards: [{ kind: 'quest', seeds: ['q'], max: 1 }] },
        turnExpects: [null],
        turns: [shown],
      },
    ],
  });
}

const THE_SUITE: Suite = {
  world: 'p5',
  tags: { J10: ['no-such-case'] },
  j10StatesDay: [],
  thresholds: [],
  largeWorld: {
    tags: { V: [{ case: 'a-v-case', seed: 'q' }] },
    thresholds: [{ metric: 'E4', kind: 'target', comparator: '>=', value: 0.8 }],
  },
};

describe('A run of the large world', () => {
  it('reads its own tags and thresholds, so that E4 is of its cases', () => {
    const report = p5Report(runOfLargeWorld(LARGE_WORLD), largeWorldSuite(THE_SUITE));

    expect(report.metrics.find(({ metric }) => metric === 'E4')).toMatchObject({
      k: 1,
      n: 1,
      verdicts: [{ passed: true }],
    });
  });

  it('reads the cards by one step, seed names through the world’s ids', () => {
    const [subset] = p5Report(runOfLargeWorld(LARGE_WORLD), largeWorldSuite(THE_SUITE)).subsets;

    expect(subset).toMatchObject({ subset: 'V', shown: 1, right: 1, expected: 1 });
  });

  it('leaves out of its section what it does not measure, under its own title', () => {
    const section = p5Section(
      p5Report(runOfLargeWorld(LARGE_WORLD), largeWorldSuite(THE_SUITE)),
      (_, rows) => rows.map((row) => row[0]).join(' '),
      `The P05 suite, ${LARGE_WORLD}`,
    );

    expect(section[0]).toBe(`## The P05 suite, ${LARGE_WORLD}`);
    expect(section[2]).toBe('E1 E4 E8');
  });

  it('is never put beside a run of another world or version', () => {
    expect(() => compare(runOfLargeWorld('large-world-v1'), runOfLargeWorld('large-world-v2'))).toThrow('two worlds');
    expect(() => compare(runOfLargeWorld('p5'), runOfLargeWorld('large-world-v1'))).toThrow('two worlds');
    expect(compare(runOfLargeWorld(LARGE_WORLD), runOfLargeWorld(LARGE_WORLD))).toContain('# Comparison');
  });

  it('needs the suite to hold it', () => {
    const { largeWorld: _none, ...without } = THE_SUITE;

    expect(() => largeWorldSuite(without)).toThrow('no large world');
  });
});

describe('Subset C', () => {
  it('reports subset C as E9 alone, outside E1 and E3', () => {
    const tagsOfC: Suite = {
      ...THE_SUITE,
      largeWorld: { tags: { C: [{ case: 'a-v-case', seed: 'q' }] }, thresholds: [] },
    };
    const { metrics } = p5Report(runOfLargeWorld(LARGE_WORLD), largeWorldSuite(tagsOfC));
    const measured = (name: string): object | undefined => {
      const metric = metrics.find((one) => one.metric === name);
      return metric === undefined ? undefined : { k: metric.k, n: metric.n };
    };

    expect(measured('E9')).toEqual({ k: 1, n: 1 });
    expect(measured('E1')).toEqual({ k: 0, n: 0 });
    expect(measured('E3')).toEqual({ k: 0, n: 0 });
  });
});
