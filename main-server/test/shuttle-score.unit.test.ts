/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { fileURLToPath } from 'node:url';
import { readLogFiles } from '../scripts/shuttle/read-log-files.ts';
import { scoreLeaveOneDayOut } from '../scripts/shuttle/score.ts';
import { type LogFile, loadDays } from '../scripts/shuttle/sets.ts';
import { deriveTiming } from '../scripts/shuttle/timing.ts';
import { cleanedLog, logFile } from './shuttle-fixtures.ts';

// Two cars on stops 0 to 3, or on 8 to 11 on the last of these days. Each makes three rides a day: the first stop's
// next to the one after, that one to the next, and across both.
const LOGS = {
  // 120 s, 120 s and 240 s; the cars 300 s apart, so a wait of 150 s.
  monday: logFile('score-2026-11-02'),
  // 150 s, 150 s and 300 s; 360 s apart, a wait of 180 s.
  tuesday: logFile('score-2026-11-03'),
  // 120 s, 120 s and 240 s; 420 s apart, a wait of 210 s, which is the baseline.
  wednesday: logFile('score-2026-11-04'),
  // As Monday, on other stops.
  thursday: logFile('score-2026-11-05'),
};

function score(...logs: LogFile[]): ReturnType<typeof scoreLeaveOneDayOut> {
  return scoreLeaveOneDayOut(logs.map((log) => cleanedLog(log).day));
}

function evening(log: LogFile): LogFile {
  return { ...log, csv: log.csv.replaceAll('T10:', 'T20:') };
}

describe('the score of the rides', () => {
  it('compares each day with the constants of the other, pooling every held-out ride', () => {
    const { ride } = score(LOGS.monday, LOGS.tuesday);
    expect(ride.samples).toBe(12);
    // Each day's three rides miss by 30, 30 and 60 s.
    expect(ride.mae).toBeCloseTo(40, 5);
    expect(ride.withinOneMinute).toBe(1);
  });

  it('compares the rides with along-loop distance at 4.15 m/s', () => {
    const { ride } = score(LOGS.monday, LOGS.tuesday);
    // 274 m is 66.0 s, 357 m is 86.0 s and both are 152.0 s, against 120, 120 and 240 s and 150, 150 and 300 s.
    expect(ride.baselineMae).toBeCloseTo((54 + 34 + 88 + 84 + 64 + 148) / 6, 0);
    expect(ride.baselineWithinOneMinute).toBeCloseTo(2 / 6, 5);
  });
});

describe('the score of the waits', () => {
  it('pools the waits with each scored stop-band weighing the same', () => {
    const { wait } = score(LOGS.monday, LOGS.tuesday);
    expect(wait.stopBands).toBe(6);
    expect(wait.mae).toBe(30);
    // 3.5 minutes misses Monday by 60 s and Tuesday by 30 s.
    expect(wait.baselineMae).toBe(45);
  });

  it('scores no wait after 19:00, though the file holds one', () => {
    const { ride, wait, holds } = score(evening(LOGS.monday), evening(LOGS.tuesday));
    expect(ride.samples).toBe(12);
    expect(wait.stopBands).toBe(0);
    expect(holds).toBe(false);
    expect(deriveTiming([cleanedLog(evening(LOGS.monday)).day]).waits['0']).toEqual({ '19-21': 150 });
  });
});

describe('the threshold and the folds', () => {
  it('holds when both MAEs are below their baselines', () => {
    expect(score(LOGS.monday, LOGS.tuesday).holds).toBe(true);
  });

  it('does not hold when the wait MAE is not', () => {
    const { ride, wait, holds } = score(LOGS.monday, LOGS.wednesday);
    expect(ride.mae).toBe(0);
    expect(wait.mae).toBe(60);
    expect(wait.baselineMae).toBe(30);
    expect(holds).toBe(false);
  });

  it('takes three days as three folds, each trained on the other two together', () => {
    const { ride, wait } = score(LOGS.monday, LOGS.tuesday, LOGS.wednesday);
    expect(ride.samples).toBe(18);
    // Held-out Monday and Wednesday are told 135 s, 135 s and 270 s, and Tuesday 120 s, 120 s and 240 s.
    expect(ride.mae).toBeCloseTo(80 / 3, 5);
    expect(wait.stopBands).toBe(9);
    // Told 196, 185 and 166 s against 150, 180 and 210 s, each across headways of two days.
    expect(wait.mae).toBeCloseTo(95 / 3, 5);
    expect(wait.baselineMae).toBe(30);
  });

  it('predicts a stop-band and a pair-band the training days lack with the fallback', () => {
    const { ride, wait, holds } = score(LOGS.monday, LOGS.thursday);
    expect(ride.samples).toBe(12);
    expect(ride.mae).toBe(ride.baselineMae);
    expect(wait.mae).toBe(wait.baselineMae);
    expect(holds).toBe(false);
  });
});

describe('reading the logged days', () => {
  it('reads plain and gzipped days, each with its set log', () => {
    const folder = fileURLToPath(new URL('fixtures/shuttle/days/', import.meta.url));
    const { days } = loadDays(readLogFiles(folder));
    expect(days.map(({ date, sets }) => [date, sets.map(({ cars }) => cars.size)])).toEqual([
      ['2026-11-02', [1, 1, 1, 1]],
      ['2026-11-03', [1, 1, 1, 0]],
    ]);
  });
});
