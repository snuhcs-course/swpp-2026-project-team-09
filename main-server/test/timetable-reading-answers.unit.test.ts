/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { checkedReading } from '../src/timetable-reading/reading-checks.js';
import {
  agreed,
  fadeCases,
  type FadeRule,
  fadeRuleEnd,
  type Saved,
  savedAnswers,
  scored,
} from '../eval/timetable-reading/saved.ts';
import {
  FADE_NAMES,
  type ReadingScore,
  SCREENSHOTS,
  scoreReading,
  SYNTHETIC_NAMES,
  truthOf,
} from '../eval/timetable-reading/score.ts';

// P15-52: the real model's saved answers (eval/timetable-reading/answers/<run>/), read again with the checks as they
// are now and compared with the hand-written ground truth. No model is called. The chosen design's run is held to the
// bar; `READING_TABLE=1 RUNS=a1,d2-blocks-fades` prints the tables accuracy.md gives.

// The chosen design: the label-free grid sent, the model reading the layout and, at the same time, the text
// (accuracy.md).
const CHOSEN = 'h4-parallel-thinking';

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
    `times exact ${sum(scores, 'timesExact')}/${sum(scores, 'found')}`,
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

// What the chosen design leaves out (accuracy.md): nothing, on its three readings of the nine.
const LEFT_OUT: Record<string, number> = {};

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
      // Not only within 5 minutes: every time exactly the true one (P15-52 review).
      expect(score.timesExact).toBe(score.found);
      missed += score.truthTimes - score.found;
    }
    expect(missed).toBe(LEFT_OUT[name] ?? 0);
  },
);

function clockMinutes(text: string): number {
  const [hours = 0, minutes = 0] = text.split(':').map(Number);
  return hours * 60 + minutes;
}

// Whether an end is a true end, to 5 minutes, as the score counts a time right.
function near(end: string, truth: string | null): boolean {
  return truth !== null && Math.abs(clockMinutes(end) - clockMinutes(truth)) <= 5;
}

const FADE_RULES: FadeRule[] = [
  'window',
  'usual-end',
  'model-agrees-with-pixels',
  'two-readings-agree',
  'agrees-or-reask-agrees',
];

// Each fading-end rule over the fading blocks of a grid run: right, wrong and left out, real and synthetic apart.
function fadeLines(run: string): string[] {
  return [SCREENSHOTS, FADE_NAMES].flatMap((names) => {
    const cases = fadeCases(run, names);
    return FADE_RULES.map((rule) => {
      const ends = cases.map((one) => {
        const same = cases.filter((two) => two !== one && two.name === one.name && two.seen === one.seen);
        // The next reading of the same block, or the first after the last: each reading paired once.
        const other = same.find((two) => two.n === one.n + 1) ?? same.find((two) => two.n < one.n);
        return { end: fadeRuleEnd(rule, one, other), truth: one.truthEnd };
      });
      const right = ends.filter(({ end, truth }) => end !== null && near(end, truth)).length;
      const wrong = ends.filter(({ end, truth }) => end !== null && !near(end, truth)).length;
      return `${run} fades (${names === SCREENSHOTS ? 'real' : 'synthetic'}), ${rule}: right ${right}, wrong ${wrong}, left out ${ends.length - right - wrong} of ${ends.length}`;
    });
  });
}

it('prints the tables', () => {
  if (process.env.READING_TABLE === '1') {
    for (const run of (process.env.RUNS ?? CHOSEN).split(',')) {
      const synthetic = savedAnswers(run, 3, SYNTHETIC_NAMES).length > 0;
      const fades = savedAnswers(run, 3, FADE_NAMES).length > 0;
      const out = [
        ...lines(run, SCREENSHOTS),
        ...(synthetic ? lines(run, SYNTHETIC_NAMES, `${run}, synthetic`) : []),
        ...(fades ? lines(run, FADE_NAMES, `${run}, synthetic fades`) : []),
      ];
      process.stdout.write(
        `${[...out, ...agreedLines(run), ...(/^[gh]/u.test(run) ? fadeLines(run) : [])].join('\n')}\n`,
      );
    }
  }
  expect(SCREENSHOTS).toHaveLength(9);
});
