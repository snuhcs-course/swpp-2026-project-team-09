/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { loadDays } from '../scripts/shuttle/sets.ts';
import { BASELINE_DRIVE_SECONDS, longLimitSeconds } from '../scripts/shuttle/visits.ts';
import { ridesOf } from '../scripts/shuttle/timing.ts';
import { cleaned, reasons } from './shuttle-fixtures.ts';

const HEADER = 'received_at,car_id,stop_id,stop_name,loop_order';
const NO_SET_LOG = 'received_at,cars\n';

describe('the constants', () => {
  it("has the spec's baseline drives", () => {
    expect(BASELINE_DRIVE_SECONDS).toEqual([80, 66, 86, 61, 39, 264, 70, 83, 55, 142, 120, 57, 53, 82]);
  });

  it('gives the layover stop a shorter LONG limit than the others', () => {
    expect(longLimitSeconds(5)).toBe(444);
    expect(longLimitSeconds(0)).toBe(680);
    expect(longLimitSeconds(13)).toBe(682);
  });
});

describe('R1 clock', () => {
  it('stops on a time without an offset', () => {
    const csv = `${HEADER}\n2026-11-02T10:00:00,4531,s0,정문,0\n`;
    expect(() => loadDays([{ csv, setLog: NO_SET_LOG }])).toThrow('R1: received_at has no offset');
  });

  it('stops on a set outside 07:55–21:05 in Korea', () => {
    const csv = `${HEADER}\n2026-11-02T22:00:00+09:00,4531,s0,정문,0\n`;
    expect(() => loadDays([{ csv, setLog: NO_SET_LOG }])).toThrow('R1: a set outside 07:55–21:05');
  });

  it('stops on a set in the set log too', () => {
    const setLog = `${NO_SET_LOG}2026-11-02T07:54:59+09:00,0\n`;
    expect(() => loadDays([{ csv: `${HEADER}\n`, setLog }])).toThrow('R1: a set outside 07:55–21:05');
  });

  it('reads a UTC time as the same moment, and cleans each Korean date on its own', () => {
    const csv = [HEADER, '2026-11-02T20:59:45+09:00,4531,s0,정문,0', '2026-11-03T00:30:00Z,4531,s0,정문,0', ''].join(
      '\n',
    );
    const { days } = loadDays([{ csv, setLog: NO_SET_LOG }]);
    expect(days.map(({ date, sets }) => [date, sets.length])).toEqual([
      ['2026-11-02', 1],
      ['2026-11-03', 1],
    ]);
  });

  it('refuses the pilot sample', () => {
    const csv = `${HEADER}\n2026-10-29T15:50:29+09:00,4531,,경영대,13\n`;
    expect(() => loadDays([{ csv, setLog: NO_SET_LOG }])).toThrow('pilot sample');
  });
});

const R2_LOG = [
  HEADER,
  '2026-11-02T10:00:00+09:00,4531,s0,정문,0',
  '2026-11-02T10:00:00+09:00,4532,s3,농생대,3',
  '2026-11-02T10:00:15+09:00,4531,s0,정문,0',
  '2026-11-02T10:00:15+09:00,4531,s1,법과대,1',
  '2026-11-02T10:00:15+09:00,4532,s3,농생대,3',
  '2026-11-02T10:00:30+09:00,4531,s0,정문,0',
  '2026-11-02T10:00:30+09:00,4531,s0,정문,0',
  '2026-11-02T10:00:45+09:00,4531',
  '2026-11-02T10:00:45+09:00,4532,s14,없는곳,14',
  '2026-11-02T10:00:45+09:00,4533,s0,정문,0',
  '2026-11-02T01:00:45.000Z,4534,s0,정문,0',
  '',
].join('\n');
const R2_LOADED = loadDays([{ csv: R2_LOG, setLog: NO_SET_LOG }]);
const R2_SETS = R2_LOADED.days[0]?.sets ?? [];

describe('R2 sets', () => {
  it('makes each distinct time a set', () => {
    expect(R2_SETS).toHaveLength(4);
  });

  it('drops a car listed at two stops from that set only', () => {
    expect([...(R2_SETS[1]?.cars ?? [])]).toEqual([['4532', 3]]);
    expect(R2_LOADED.report).toContainEqual({
      rule: 'R2',
      reason: 'car at two stops',
      detail: '4531 at 2026-11-02T10:00:15+09:00',
    });
  });

  it('keeps the first of a row listed twice', () => {
    expect([...(R2_SETS[2]?.cars ?? [])]).toEqual([['4531', 0]]);
    expect(R2_LOADED.report).toContainEqual({
      rule: 'R2',
      reason: 'repeated row',
      detail: '4531 at 2026-11-02T10:00:30+09:00',
    });
  });
});

describe('R2 rows', () => {
  it('drops a garbled row', () => {
    expect(R2_LOADED.report).toContainEqual({
      rule: 'R2',
      reason: 'garbled row',
      detail: '2026-11-02T10:00:45+09:00,4531',
    });
    expect(R2_LOADED.report).toContainEqual({
      rule: 'R2',
      reason: 'garbled row',
      detail: '2026-11-02T10:00:45+09:00,4532,s14,없는곳,14',
    });
  });

  it('keeps the first of a repeated set time', () => {
    expect([...(R2_SETS[3]?.cars ?? [])]).toEqual([['4533', 0]]);
    expect(R2_LOADED.report).toContainEqual({
      rule: 'R2',
      reason: 'repeated set time',
      detail: '2026-11-02T01:00:45.000Z',
    });
  });

  it('adds the empty sets of the set log', () => {
    const setLog = `${NO_SET_LOG}2026-11-02T10:00:00+09:00,1\n2026-11-02T10:00:15+09:00,0\n`;
    const log = { csv: `${HEADER}\n2026-11-02T10:00:00+09:00,4531,s0,정문,0\n`, setLog };
    expect(loadDays([log]).days[0]?.sets.map(({ cars }) => cars.size)).toEqual([1, 0]);
  });
});

describe('R3 isolated sighting', () => {
  it('drops a ghost seen for one set', () => {
    const { day, report } = cleaned('r03-isolated-sighting');
    expect(report).toEqual([{ rule: 'R3', reason: 'isolated sighting', detail: '4599 at stop 3, 10:01:00' }]);
    expect(day.visits.get('4599')).toEqual([]);
  });
});

describe('R4 flicker', () => {
  const { day, report } = cleaned('r04-flicker');

  it('merges a parked car back after it drifts to a neighbouring stop', () => {
    expect(report).toContainEqual({ rule: 'R4', reason: 'flicker', detail: '4526 at stop 1, 10:01:15, 2 sets' });
    expect(day.visits.get('4526')?.map(({ stop, times }) => [stop, times.length])).toEqual([[0, 10]]);
    expect(day.departures.filter(({ car }) => car === '4526')).toEqual([]);
  });

  it('deletes a blip on a real stop change and keeps the move', () => {
    expect(report).toContainEqual({ rule: 'R4', reason: 'flicker', detail: '4531 at stop 9, 10:01:00, 1 sets' });
    expect(day.visits.get('4531')?.map(({ stop, exit }) => [stop, exit])).toEqual([
      [3, 'STEP'],
      [4, null],
    ]);
  });

  it('reports nothing else', () => {
    expect(reasons(report)).toEqual(['R4 flicker']);
  });
});

describe('R5 visit', () => {
  const { day, report } = cleaned('r05-visit');

  it('keeps a visit through a dropout of under 8 minutes', () => {
    expect(day.visits.get('4526')?.map(({ times }) => times.length)).toEqual([12]);
  });

  it('cuts a visit where the car is absent for 8 minutes', () => {
    expect(day.visits.get('4523')?.map(({ times, exit }) => [times.length, exit])).toEqual([
      [4, 'ABSENT'],
      [4, null],
    ]);
    expect(reasons(report)).toEqual(['R6 no departure: ABSENT']);
  });
});

describe('R6 move', () => {
  const { day, report } = cleaned('r06-moves');
  const stops = (departures: typeof day.departures): number[] => departures.map(({ stop }) => stop);

  it('tells every kind of move apart', () => {
    expect(day.visits.get('4531')?.map(({ exit }) => exit)).toEqual([
      'STEP',
      'SKIP',
      'GAP',
      'BREAK',
      'JUMP',
      'JUMP',
      'ABSENT',
      null,
    ]);
  });

  it('gives a departure only for a STEP, a SKIP or a GAP', () => {
    expect(stops(day.departures)).toEqual([2, 3, 4, 5]);
    expect(report.filter(({ rule }) => rule === 'R6')).toEqual([
      { rule: 'R6', reason: 'no departure: BREAK', detail: '4531 at stop 6, 10:03:45' },
      { rule: 'R6', reason: 'no departure: JUMP', detail: '4531 at stop 9, 10:05:30' },
      { rule: 'R6', reason: 'no departure: JUMP', detail: '4531 at stop 2, 10:06:30' },
      { rule: 'R6', reason: 'no departure: ABSENT', detail: '4531 at stop 1, 10:07:30' },
    ]);
  });

  it('times only the move entered and left in step', () => {
    expect(ridesOf(day)).toEqual([{ from: 3, to: 5, band: '08-11', seconds: 60 }]);
  });
});
