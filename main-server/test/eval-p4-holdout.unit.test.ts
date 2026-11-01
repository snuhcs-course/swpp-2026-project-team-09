/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { casesIn, type EvalCase, loadCases } from '../eval/cases.ts';
import { compare } from '../eval/compare.ts';
import { FALLBACK_PRICES } from '../eval/cost.ts';
import { parseFlags, type RunOptions, runName } from '../eval/options.ts';
import { casesToRun, holdoutCases, p4Holdout } from '../eval/p4/holdout.ts';
import { scoreRun } from '../eval/run-score.ts';
import { scorecard } from '../eval/scorecard.ts';
import { caseRun, goodMenus, savedRun, turn } from './eval-traces.ts';

// The P4 holdout (P04 ticket 06): taken by rule, reworded and nothing else, kept apart from the 40 cases, and read by
// its rates alone. From the suite's files, with no app and no model.

const cases = casesIn(loadCases(), 'p4');
const holdout = holdoutCases(cases);

function originalOf({ id }: EvalCase): EvalCase {
  const found = cases.find((evalCase) => `holdout-${evalCase.id}` === id);
  if (found === undefined) {
    throw new Error(`No case for ${id}`);
  }
  return found;
}

function withoutLastTurn({ id: _id, turns, ...rest }: EvalCase): object {
  return { ...rest, earlier: turns.slice(0, -1) };
}

function lastUser({ turns }: EvalCase): string {
  const last = turns.at(-1);
  return last !== undefined && 'user' in last ? last.user : '';
}

describe('The holdout set', () => {
  it('is taken by rule: each category sorted by id, in 4 equal parts, the middle case of each', () => {
    const byRule = [...new Set(cases.map(({ category }) => category))].flatMap((category) => {
      const ids = cases
        .filter((evalCase) => evalCase.category === category)
        .map(({ id }) => id)
        .toSorted();
      return [0, 1, 2, 3].map((part) => ids[Math.floor(((part + 0.5) * ids.length) / 4)]);
    });

    expect(
      p4Holdout()
        .wordings.map(({ of }) => of)
        .toSorted(),
    ).toEqual(byRule.toSorted());
    expect(byRule).toHaveLength(12);
  });

  it('changes only the last User turn of each case, and the id that tells it apart', () => {
    for (const reworded of holdout) {
      const original = originalOf(reworded);

      expect(withoutLastTurn(reworded)).toEqual(withoutLastTurn(original));
      expect(reworded.turns).toHaveLength(original.turns.length);
    }
  });

  it('really rewords each case', () => {
    const unchanged = holdout.filter((reworded) => lastUser(reworded) === lastUser(originalOf(reworded)));

    expect(unchanged.map(({ id }) => id)).toEqual([]);
  });

  it('runs each case 3 times, as the fixed set does', () => {
    expect(holdout.filter(({ repeat }) => repeat !== 3).map(({ id }) => id)).toEqual([]);
  });

  it('refuses a wording of a case there is not', () => {
    const wordings = [{ of: 'no-such-case', user: '안녕' }];

    expect(() => holdoutCases(cases, { ...p4Holdout(), wordings })).toThrow('no-such-case');
  });
});

describe('Kept apart', () => {
  it('leaves the 40 cases of the suite exactly as they run', () => {
    expect(casesToRun({ world: 'p4' })).toEqual(cases);
    expect(cases).toHaveLength(40);
  });

  it('runs its own 12 cases, and only with its own flag', () => {
    expect(casesToRun({ world: 'p4', holdout: true }).map(({ id }) => id)).toEqual(holdout.map(({ id }) => id));
    expect(parseFlags(['--world', 'p4', '--holdout'], { ASSISTANT_MODEL: 'test/model' }).options.holdout).toBe(true);
    expect(parseFlags(['--world', 'p4'], { ASSISTANT_MODEL: 'test/model' }).options.holdout).toBeUndefined();
  });

  it('refuses a holdout of a world that has none', () => {
    expect(() => parseFlags(['--holdout'], { ASSISTANT_MODEL: 'test/model' })).toThrow('--holdout');
  });

  it('names its run apart from the official run of that commit', () => {
    const options: RunOptions = {
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
      prices: FALLBACK_PRICES,
      commit: 'abc1234',
    };
    const startedAt = new Date('2026-11-02T03:00:00Z');

    expect(runName({ ...options, holdout: true }, startedAt)).toBe(`${runName(options, startedAt)}-holdout`);
  });
});

describe('How a run of the holdout is read', () => {
  const failed = caseRun({
    id: 'holdout-a-failing-case',
    turns: [turn({ text: '답장에 적힌 말이에요.' })],
  });
  const passed = caseRun({ id: 'holdout-a-passing-case', turns: [goodMenus] });
  const run = savedRun([passed, failed], { world: 'p4', holdout: true });

  it('shows its pass rates and layer rates', () => {
    const card = scorecard(scoreRun(run));

    expect(card).toContain('## The P4 holdout');
    expect(card).toContain('| Overall | 1/2 (50.0%) |');
    expect(card).toContain('| Tools | 1/2 (50.0%) |');
  });

  it('names no case and quotes no reply, so that no failure of it is opened', () => {
    const card = scorecard(scoreRun(run));

    expect(card).not.toContain('holdout-a-failing-case');
    expect(card).not.toContain('holdout-a-passing-case');
    expect(card).not.toContain('답장에 적힌 말이에요');
  });

  it('judges no threshold', () => {
    expect(scorecard(scoreRun(run))).not.toMatch(/PASS|FAIL/u);
  });

  it('is not compared, which would list its cases', () => {
    expect(() => compare(scoreRun(run), scoreRun(run))).toThrow('holdout');
  });
});
