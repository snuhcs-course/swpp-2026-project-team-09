/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type UnknownWindow } from '../scripts/shuttle/departures.ts';
import { clockTime } from '../scripts/shuttle/sets.ts';
import { deriveTiming, ridesOf, waitCells, waitReport } from '../scripts/shuttle/timing.ts';
import { cleaned, cleanedLog, logFile, reasons } from './shuttle-fixtures.ts';

const ALL_STOPS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

function windowsOf(windows: UnknownWindow[]): [string, string, readonly number[], string, string][] {
  return windows
    .map(({ reason, car, stops, from, to }): [string, string, readonly number[], string, string] => [
      reason,
      car,
      stops,
      clockTime(from),
      clockTime(to),
    ])
    .toSorted(([, a], [, b]) => a.localeCompare(b));
}

describe('R7 LONG', () => {
  const { day, report } = cleaned('r07-long-visit');

  it('takes a visit over the limit out of the rides, and reports it', () => {
    expect(report).toEqual([{ rule: 'R7', reason: 'LONG visit', detail: '4531 at stop 5, 10:02:00' }]);
    expect(ridesOf(day).filter(({ from, to }) => from === 5 && to === 6)).toEqual([
      { from: 5, to: 6, band: '08-11', seconds: 435 },
    ]);
  });

  it('counts its departure all the same', () => {
    expect(day.departures.filter(({ stop }) => stop === 5).map(({ car }) => car)).toEqual(['4531', '4532']);
  });
});

describe('R8 event', () => {
  const { day, report } = cleaned('r08-events');

  it('gives one event at the stop left and one at each skipped stop, at the first set at the next stop', () => {
    expect(day.departures.map(({ stop, car, at }) => [stop, car, clockTime(at)])).toEqual([
      [3, '4532', '10:01:00'],
      [4, '4532', '10:01:00'],
      [5, '4532', '10:02:00'],
    ]);
  });

  it('counts no move that the next visit does not confirm', () => {
    expect(report.filter(({ rule }) => rule === 'R8')).toEqual([
      { rule: 'R8', reason: 'departure not confirmed', detail: '4520 at stop 5, 10:00:00' },
      { rule: 'R8', reason: 'departure not confirmed', detail: '4531 at stop 0, 10:00:00' },
    ]);
    expect(windowsOf(day.windows)).toEqual([
      ['unconfirmed move', '4520', [5], '10:12:15', '10:12:30'],
      ['unconfirmed move', '4531', [0], '10:00:45', '10:01:00'],
      ['BREAK', '4531', [1, 2, 3], '10:01:00', '10:02:00'],
    ]);
  });
});

describe('R9 unknown windows', () => {
  it('marks the stops a BREAK and a JUMP passed', () => {
    expect(windowsOf(cleaned('r06-moves').day.windows)).toEqual([
      ['set gap', '-', ALL_STOPS, '10:08:15', '10:16:15'],
      ['BREAK', '4531', [6, 7, 8], '10:04:30', '10:05:30'],
      ['forward JUMP', '4531', [9, 10, 11, 12, 13, 0, 1], '10:05:30', '10:06:30'],
      ['backward JUMP', '4531', [2], '10:07:15', '10:07:30'],
    ]);
  });

  const { day, report } = cleaned('r09-windows');

  it('marks all stops for an ABSENT car and for one first seen or lost mid-day', () => {
    expect(windowsOf(day.windows)).toEqual([
      ['first seen mid-day', '4502', ALL_STOPS, '10:00:00', '10:05:00'],
      ['lost mid-day', '4503', ALL_STOPS, '10:01:45', '10:30:00'],
      ['ABSENT', '4507', ALL_STOPS, '10:02:45', '10:12:45'],
    ]);
  });

  it('only notes a car that vanishes at a parking stop', () => {
    expect(report.filter(({ reason }) => reason === 'left the feed at a parking stop')).toEqual([
      { rule: 'R9', reason: 'left the feed at a parking stop', detail: '4504 at stop 4, 10:01:00' },
      { rule: 'R9', reason: 'left the feed at a parking stop', detail: '4506 at stop 0, 10:10:30' },
      { rule: 'R9', reason: 'left the feed at a parking stop', detail: '4505 at stop 5, 10:05:00' },
    ]);
  });

  it('marks no window for a JUMP after standing 10 minutes, nor for ABSENT with neither side timed', () => {
    expect(report).toContainEqual({ rule: 'R6', reason: 'no departure: JUMP', detail: '4506 at stop 5, 10:00:00' });
    expect(report).toContainEqual({ rule: 'R6', reason: 'no departure: ABSENT', detail: '4508 at stop 10, 10:00:00' });
    expect(day.windows.map(({ car }) => car)).not.toContain('4506');
    expect(day.windows.map(({ car }) => car)).not.toContain('4508');
  });

  it('marks all stops for a gap of 8 minutes between sets', () => {
    expect(windowsOf(cleaned('r09-set-gap').day.windows)).toEqual([
      ['set gap', '-', ALL_STOPS, '10:00:45', '10:09:45'],
    ]);
  });

  it('tells empty sets from an outage by the set log', () => {
    const { csv } = logFile('r09-set-gap');
    const setLog = 'received_at,cars\n2026-11-02T10:05:00+09:00,0\n';
    expect(cleanedLog({ csv, setLog }).day.windows).toEqual([]);
  });
});

describe('R10 headways and the kept share of R11', () => {
  const { day, report } = cleaned('r10-headways');

  it('drops a headway that overlaps a window at its stop, with the reason', () => {
    expect(
      day.headways.map(({ stop, start, end, droppedFor }) => [stop, clockTime(start), clockTime(end), droppedFor]),
    ).toEqual([
      [4, '10:02:00', '10:08:00', null],
      [4, '10:08:00', '10:14:00', 'BREAK'],
    ]);
    expect(report).toContainEqual({
      rule: 'R10',
      reason: 'headway dropped: BREAK',
      detail: 'stop 4, 10:08:00–10:14:00',
    });
  });

  it('keeps out a stop-band with under 75% of its headway time kept', () => {
    expect(waitReport(waitCells([day]))).toEqual([
      { rule: 'R11', reason: 'under 75% of the headway time kept', detail: 'stop 4, 08-11: kept 360 s, dropped 360 s' },
    ]);
    expect(deriveTiming([day]).waits).toEqual({});
  });
});

describe('R11 wait', () => {
  const { day } = cleaned('r11-band-edge');

  // The headway is 600 s, 10:55:51 to 11:05:51 once 38동's 39 s are taken off. A rider before 11:00 waits between 600 s
  // and 351 s, and one after it between 351 s and nothing.
  it('splits a headway at the band edge, on the clock of the event minus its baseline drive', () => {
    expect(waitCells([day]).map(({ stop, band, waitSeconds }) => [stop, band, waitSeconds])).toEqual([
      [4, '08-11', 475.5],
      [4, '11-14', 175.5],
    ]);
  });

  it('writes both bands to the file', () => {
    expect(deriveTiming([day]).waits).toEqual({ '4': { '08-11': 476, '11-14': 176 } });
  });
});

describe('R12 ride', () => {
  const { day, report } = cleaned('r12-rides');

  it('times only the segments between timed arrivals, and a ride may end at a LONG visit', () => {
    expect(ridesOf(day)).toEqual([
      { from: 1, to: 2, band: '08-11', seconds: 60 },
      { from: 4, to: 5, band: '11-14', seconds: 60 },
      { from: 6, to: 7, band: '11-14', seconds: 60 },
    ]);
  });

  it('reports each segment it lost, with the cause', () => {
    expect(report).toEqual([
      { rule: 'R12', reason: 'left in a GAP', detail: '4531 at stop 2, 11:00:45' },
      { rule: 'R12', reason: 'arrival not timed', detail: '4531 at stop 3, 11:02:30' },
      { rule: 'R7', reason: 'LONG visit', detail: '4531 at stop 5, 11:04:30' },
    ]);
    expect(reasons(report)).toHaveLength(3);
  });
});
