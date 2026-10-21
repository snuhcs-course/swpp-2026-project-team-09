/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { scoreRun } from '../eval/run-score.ts';
import { scoreCase } from '../eval/score.ts';
import {
  badMenus,
  caseRun,
  expectOf,
  goodMenus,
  menusExpect,
  menusFound,
  minsuSeveral,
  names,
  savedRun,
  turn,
} from './eval-traces.ts';

// The benchmark's cases and runs scored (P19 ticket 02) on hand-made traces: live cases, known failures, failure
// kinds, pass^k and the run's totals. No app, no model.

const greet = expectOf({ actions: ['CHAT'], tools: { forbidden: '*' } });

describe('A case', () => {
  it('passes when its scored turn passes', () => {
    expect(scoreCase(caseRun({ turns: [goodMenus] }), names).passed).toBe(true);
    expect(scoreCase(caseRun({ turns: [badMenus] }), names).passed).toBe(false);
  });

  it('fails when it has no expectation', () => {
    expect(scoreCase(caseRun({ expect: null, turns: [goodMenus] }), names).passed).toBe(false);
  });
});

describe('A live case', () => {
  it("scores its turns by their own expectations, the last by the case's when it has none", () => {
    const live = caseRun({
      kind: 'live',
      turnExpects: [greet, null],
      turns: [turn({ text: '안녕하세요' }), goodMenus],
    });

    const score = scoreCase(live, names);

    expect(score.turns.map(({ score: turnScore }) => turnScore?.action)).toEqual(['CHAT', 'TOOL']);
    expect(score.passed).toBe(true);
  });

  it('counts its later turns as not run after a failed one, and fails', () => {
    const live = caseRun({
      kind: 'live',
      turnExpects: [greet, menusExpect],
      turns: [turn({ steps: [[menusFound]], text: '네' })],
    });

    const score = scoreCase(live, names);

    expect(score.turns.map(({ score: turnScore }) => turnScore?.passed ?? 'not run')).toEqual([false, 'not run']);
    expect(score.passed).toBe(false);
  });
});

describe('Known failures and failure kinds', () => {
  it('are reported apart, with the known failures that now pass', () => {
    const run = scoreRun(
      savedRun([
        caseRun({ turns: [goodMenus] }),
        caseRun({ id: 'menus-b', turns: [badMenus] }),
        caseRun({ id: 'menus-known', knownFailure: '학관', turns: [goodMenus] }),
        caseRun({ id: 'menus-known-failing', knownFailure: '학관', turns: [badMenus] }),
      ]),
    );

    expect(run.categories.menus).toMatchObject({ runs: 2, passed: 1, knownRuns: 2, knownPassed: 1 });
    expect(run.knownNowPassing).toEqual(['menus-known']);
  });

  it('count each failure kind per category', () => {
    const run = scoreRun(
      savedRun([
        caseRun({ turns: [turn({ failure: 'STEP_LIMIT' })] }),
        caseRun({ id: 'b', turns: [turn({ failure: 'TIMEOUT' })] }),
        caseRun({ id: 'c', category: 'shuttle', turns: [turn({ failure: 'ERROR' })] }),
      ]),
    );

    expect(run.categories.menus?.failures).toEqual({ STEP_LIMIT: 1, TIMEOUT: 1, ERROR: 0 });
    expect(run.categories.shuttle?.failures).toEqual({ STEP_LIMIT: 0, TIMEOUT: 0, ERROR: 1 });
  });
});

describe('pass^k', () => {
  it('counts a repeated case only when every run of it passed', () => {
    const run = scoreRun(
      savedRun([
        ...[1, 2, 3].map((repetition) => caseRun({ repetition, turns: [goodMenus] })),
        ...[1, 2, 3].map((repetition) =>
          caseRun({ id: 'b', repetition, turns: [repetition === 2 ? badMenus : goodMenus] }),
        ),
        caseRun({ id: 'once', turns: [goodMenus] }),
      ]),
    );

    expect(run.passK).toEqual({
      k: 3,
      cases: [
        { id: 'menus-today-lunch', runs: 3, passed: 3 },
        { id: 'b', runs: 3, passed: 2 },
      ],
      passedAll: 1,
    });
  });
});

describe("A run's measures", () => {
  const ask = expectOf({ actions: ['ASK', 'TOOL+ASK'], text: { mentions: ['이민수', '김민수'] } });
  const run = scoreRun(
    savedRun([
      caseRun({ turns: [goodMenus] }),
      caseRun({ id: 'b', turns: [badMenus] }),
      caseRun({
        id: 'c',
        category: 'ask',
        expect: ask,
        turns: [turn({ steps: [[minsuSeveral]], text: '이민수, 김민수 중 누구요' })],
      }),
    ]),
  );

  it('give action recall per kind, a turn counting toward the action it took when accepted, else the first accepted', () => {
    expect(run.recall).toMatchObject({ TOOL: { expected: 2, recalled: 2 }, ASK: { expected: 1, recalled: 1 } });
    expect(run.recall.PROPOSE).toEqual({ expected: 0, recalled: 0 });
  });

  it('give tool selection, argument accuracy, over- and under-calling', () => {
    expect(run.toolSelection).toEqual({ turns: 3, correct: 2 });
    expect(run.args).toEqual({ expected: 2, matched: 2 });
    expect(run.overCalling).toEqual({ turns: 3, withOver: 1, calls: 1 });
    expect(run.underCalling).toEqual({ turns: 3, withUnder: 1, calls: 1 });
  });

  it('sum steps, latency and tokens, and price them', () => {
    const one = scoreRun(savedRun([caseRun({ turns: [goodMenus] })]));

    expect(one.usage).toMatchObject({
      turns: 1,
      steps: 3,
      latencyMs: 1500,
      tokens: { inputTokens: 3000, outputTokens: 150, cacheReadTokens: 1200, cacheWriteTokens: 300 },
    });
    // 1500 uncached tokens in at USD 1 per million, 150 out at 2; the cache is free.
    expect(one.usage.costUsd).toBeCloseTo(0.0018);
  });
});
