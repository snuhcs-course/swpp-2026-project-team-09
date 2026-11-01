/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { p4Report, type P4Suite } from '../eval/p4/report.ts';
import { type CaseRun } from '../eval/runner.ts';
import { scoreRun } from '../eval/run-score.ts';
import { scorecard } from '../eval/scorecard.ts';
import {
  call,
  caseRun,
  diningShown,
  expectOf,
  goodMenus,
  menusFound,
  proposal,
  savedRun,
  turn,
} from './eval-traces.ts';

// How a run of the P4 suite is read by threshold and by layer (P04 ticket 06), from hand-made saved runs: no app and no
// model, as a stored run is read.

const SUITE: P4Suite = { cases: { menus: 2, other: 1 }, score: { overall: 0.8, perCategory: 0.7, runs: 1 } };

function runOf(cases: CaseRun[], world = 'p4'): ReturnType<typeof scoreRun> {
  return scoreRun(savedRun(cases, { world }));
}

const passing = caseRun({ id: 'a', turns: [goodMenus] });

// The tools and the buttons were right, and the reply left out the word.
const wordsMissing = caseRun({
  id: 'b',
  turns: [turn({ steps: [[menusFound], [diningShown]], text: '메뉴를 찾았어요.', mapButtons: ['dining'] })],
});

// The button is missing, and the word too.
const twoLayers = caseRun({ id: 'b', turns: [turn({ steps: [[menusFound]], text: '메뉴를 찾았어요.' })] });

const asks = expectOf({
  actions: ['ASK'],
  tools: { required: ['resolveFriend'] },
  text: { mentions: ['경영학과'] },
});

const severalFriends = call('resolveFriend', { name: '서준' }, { result: 'several', candidates: [], more: false });

function askRun(text: string): CaseRun {
  return caseRun({ id: 'asks', category: 'other', expect: asks, turns: [turn({ steps: [[severalFriends]], text })] });
}

const layerOf = (report: ReturnType<typeof p4Report>, layer: string): unknown =>
  report.layers.find((found) => found.layer === layer);

describe('The thresholds of a run of the P4 suite', () => {
  it('are judged overall and per category, from the suite', () => {
    const report = p4Report(runOf([passing, wordsMissing, askRun('경영학과 서준이요?')]), SUITE);

    expect(report.rates).toEqual([
      { name: 'Overall', k: 2, n: 3, wanted: 0.8, passed: false },
      { name: 'menus', k: 1, n: 2, wanted: 0.7, passed: false },
      { name: 'other', k: 1, n: 1, wanted: 0.7, passed: true },
    ]);
  });

  it('pass at the threshold exactly', () => {
    const suite: P4Suite = { cases: { menus: 10 }, score: { overall: 0.7, perCategory: 0.7, runs: 1 } };
    const failing = Array.from({ length: 3 }, () => twoLayers);
    const passingRuns = Array.from({ length: 7 }, () => passing);

    expect(p4Report(runOf([...passingRuns, ...failing]), suite).rates).toEqual([
      { name: 'Overall', k: 7, n: 10, wanted: 0.7, passed: true },
      { name: 'menus', k: 7, n: 10, wanted: 0.7, passed: true },
    ]);
  });

  it('are not judged on part of the suite, such as a run of one case', () => {
    const report = p4Report(runOf([passing]), SUITE);

    expect(report.rates).toEqual([
      { name: 'Overall', k: 1, n: 1, wanted: 0.8, passed: null },
      { name: 'menus', k: 1, n: 1, wanted: 0.7, passed: null },
      { name: 'other', k: 0, n: 0, wanted: 0.7, passed: null },
    ]);
  });
});

describe('The layers of a run', () => {
  it('count a run only where its case checks that layer', () => {
    const report = p4Report(runOf([passing, askRun('경영학과 서준이요?')]), SUITE);

    expect(report.layers).toEqual([
      { layer: 'Action', k: 2, n: 2 },
      { layer: 'Tools', k: 2, n: 2 },
      { layer: 'Arguments', k: 1, n: 1 },
      { layer: 'Cards and map buttons', k: 1, n: 1 },
      { layer: 'Proposal', k: 0, n: 0 },
      { layer: 'Words', k: 2, n: 2 },
    ]);
  });

  it('put a wrong Proposal in its own layer and a forbidden word in the words', () => {
    const proposing = expectOf({ actions: ['PROPOSE'], proposal: { capacity: 3 } });
    const proposed = turn({ text: '만들어 드릴게요.', proposal });
    const named = expectOf({ actions: ['CHAT'], text: { absent: ['오지호'] } });
    const report = p4Report(
      runOf([
        caseRun({ id: 'p', category: 'other', expect: proposing, turns: [proposed] }),
        caseRun({ id: 'n', category: 'other', expect: named, turns: [turn({ text: '오지호는 안 돼요.' })] }),
      ]),
      SUITE,
    );

    expect(layerOf(report, 'Proposal')).toEqual({ layer: 'Proposal', k: 0, n: 1 });
    expect(layerOf(report, 'Words')).toEqual({ layer: 'Words', k: 0, n: 1 });
    expect(report.wordsAlone).toEqual([{ id: 'n', repetition: 1 }]);
  });
});

describe('The action layer', () => {
  it('reads the action as if the words were right, so that a question without its word fails the words alone', () => {
    const report = p4Report(runOf([askRun('어느 서준이요?')]), SUITE);

    expect(layerOf(report, 'Action')).toEqual({ layer: 'Action', k: 1, n: 1 });
    expect(layerOf(report, 'Words')).toEqual({ layer: 'Words', k: 0, n: 1 });
    expect(report.wordsAlone).toEqual([{ id: 'asks', repetition: 1 }]);
  });

  it('reads a wrong action as wrong whatever the words', () => {
    const offered = turn({ steps: [[severalFriends]], text: '만들어 드릴게요.', proposal });
    const report = p4Report(runOf([caseRun({ id: 'asks', category: 'other', expect: asks, turns: [offered] })]), SUITE);

    expect(layerOf(report, 'Action')).toEqual({ layer: 'Action', k: 0, n: 1 });
    expect(report.wordsAlone).toEqual([]);
  });

  it('fails a turn with no reply, which is no failure of the words alone', () => {
    const failed = caseRun({ id: 'b', turns: [turn({ failure: 'ERROR' })] });
    const report = p4Report(runOf([failed]), SUITE);

    expect(layerOf(report, 'Action')).toEqual({ layer: 'Action', k: 0, n: 1 });
    expect(report.wordsAlone).toEqual([]);
  });
});

describe('The runs that failed on the words alone', () => {
  it('are those with every other layer right, each run apart', () => {
    const report = p4Report(
      runOf([passing, wordsMissing, { ...wordsMissing, repetition: 2 }, { ...twoLayers, id: 'c', repetition: 3 }]),
      SUITE,
    );

    expect(report.wordsAlone).toEqual([
      { id: 'b', repetition: 1 },
      { id: 'b', repetition: 2 },
    ]);
  });
});

describe('The cases the holdout rewords', () => {
  it('are given their pass rate in a run of the 40 cases', () => {
    const reworded = caseRun({ id: 'meals-no-noodles', turns: [goodMenus] });
    const failing = caseRun({ id: 'parties-next-gap', turns: [turn({ text: '' })] });

    expect(p4Report(runOf([passing, reworded, failing]), SUITE).reworded).toEqual({ k: 1, n: 2 });
  });
});

describe("The P4 suite's section of a scorecard", () => {
  it('shows the thresholds, the layers and the failures of the words', () => {
    const card = scorecard(runOf([passing, wordsMissing]));

    expect(card).toContain('## The P4 suite');
    expect(card).toContain('| Overall | 1/2 (50.0%) | >= 0.8: not the whole suite |');
    expect(card).toContain('| Words | 1/2 (50.0%) |');
    expect(card).toContain('- b');
  });

  it('is only in a scorecard of the P4 world', () => {
    expect(scorecard(runOf([passing], 'small'))).not.toContain('## The P4 suite');
  });
});
