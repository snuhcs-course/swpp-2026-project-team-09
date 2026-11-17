/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { checkedReading } from '../src/timetable-reading/reading-checks.js';
import { agreed, type Saved, savedAnswers, scored } from '../eval/timetable-reading/saved.ts';
import {
  type ReadingScore,
  SCREENSHOTS,
  scoreReading,
  SYNTHETIC_NAMES,
  truthOf,
} from '../eval/timetable-reading/score.ts';

// P15-52: the real model's saved answers (eval/timetable-reading/answers/<run>/), read again with the checks as they
// are now and compared with the hand-written ground truth. No model is called. The chosen design's run is held to the
// bar; `READING_TABLE=1 RUNS=a1,d2-blocks-fades` prints the tables accuracy.md gives.

// The chosen design: the phone's blocks sent, the model reading their text and a fading block's end (accuracy.md).
const CHOSEN = 'd4-chosen';

function sum(scores: readonly ReadingScore[], key: keyof ReadingScore): number {
  return scores.reduce((total, one) => total + Number(one[key]), 0);
}

// Wrong: a time read that is no true time (invented), or a true time found with its time, name or room wrong.
function wrongOf(score: ReadingScore): number {
  return score.invented + (score.found - score.allRight);
}

function summary(run: string, saved: readonly Saved[]): string {
  const scores = saved.map((one) => scored(one));
  const ms = saved.map(({ ms: time }) => time).toSorted((one, other) => one - other);
  const cost = saved.reduce((total, one) => total + one.inputTokens * 0.1e-6 + one.outputTokens * 0.5e-6, 0);
  return [
    `${run}: ${saved.length} readings`,
    `all right ${sum(scores, 'allRight')}/${sum(scores, 'truthTimes')}`,
    `wrong ${scores.reduce((total, one) => total + wrongOf(one), 0)}`,
    `invented ${sum(scores, 'invented')}`,
    `left out ${sum(scores, 'truthTimes') - sum(scores, 'found')}`,
    `grouped ${sum(scores, 'classesGroupedRight')}/${sum(scores, 'truthClasses')}`,
    `median ${ms[Math.floor(ms.length / 2)] ?? 0} ms`,
    `Haiku-priced USD ${(cost / Math.max(1, saved.length)).toFixed(5)} a reading`,
  ].join(', ');
}

function lines(run: string, names: readonly string[], label = run): string[] {
  const saved = savedAnswers(run, 3, names);
  const rows = names.map((name) => {
    const scores = saved.filter((one) => one.name === name).map((one) => scored(one));
    const wrong = [...new Set(scores.flatMap(({ wrong: list }) => list))];
    const each = scores.map((one) => `${one.allRight}/${one.truthTimes}`).join(' ');
    return `  ${name}: ${each}${wrong.length === 0 ? '' : ` — ${wrong.join('; ')}`}`;
  });
  return [summary(label, saved), ...rows];
}

function agreedLines(run: string): string[] {
  const saved = savedAnswers(run);
  const scores = SCREENSHOTS.flatMap((name) => {
    const readings = saved.filter((one) => one.name === name).map((one) => checkedReading(one.answer));
    return readings.map((reading, index) =>
      scoreReading(agreed(reading, readings[(index + 1) % readings.length] ?? reading), truthOf(name)),
    );
  });
  return [
    `${run}, two readings kept where they agree: all right ${sum(scores, 'allRight')}/${sum(scores, 'truthTimes')}, wrong ${scores.reduce((total, one) => total + wrongOf(one), 0)}, left out ${sum(scores, 'truthTimes') - sum(scores, 'found')}`,
  ];
}

// What the chosen design leaves out (accuracy.md): only snutt-grey-1's block that fades behind the tab bar, when the
// model does not read its end, which it did on one reading of three.
const LEFT_OUT: Record<string, number> = { 'snutt-grey-1': 2 };

it.each(SCREENSHOTS)(
  'reads %s with nothing wrong and nothing invented on each saved reading of the chosen design',
  (name) => {
    const saved = savedAnswers(CHOSEN, 3, [name]);
    expect(saved).toHaveLength(3);
    let missed = 0;
    for (const one of saved) {
      const score = scored(one);
      expect(score.wrong.filter((line) => !line.startsWith('missed:'))).toEqual([]);
      expect(score.allRight).toBe(score.found);
      missed += score.truthTimes - score.found;
    }
    expect(missed).toBe(LEFT_OUT[name] ?? 0);
  },
);

it('prints the tables', () => {
  if (process.env.READING_TABLE === '1') {
    for (const run of (process.env.RUNS ?? CHOSEN).split(',')) {
      const synthetic = savedAnswers(run, 3, SYNTHETIC_NAMES).length > 0;
      const out = [...lines(run, SCREENSHOTS), ...(synthetic ? lines(run, SYNTHETIC_NAMES, `${run}, synthetic`) : [])];
      process.stdout.write(`${[...out, ...agreedLines(run)].join('\n')}\n`);
    }
  }
  expect(SCREENSHOTS).toHaveLength(9);
});
