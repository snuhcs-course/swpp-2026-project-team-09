/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_PLAN_3 } from '@/api/mock/data/meal-answer-plan-3';
import { clashes, clockOf, droppedAt, shareOf, stepped } from '@/features/assistant/time-band';

// The band of the third Plan of the stored reply to "배고파, 민수랑 같이": the range 11:30 to 13:30, the band 12:33 to
// 12:59. The expected values are worked by hand from the rule: steps of five minutes, inside the range, and at least
// 15 minutes between the handles.
const { band } = MEAL_PLAN_3;
const at = (clock: string): string => `2026-11-17T${clock}:00+09:00`;
const stretch = (start: string, end: string): { startAt: string; endAt: string } => ({
  startAt: at(start),
  endAt: at(end),
});

describe('shareOf', () => {
  // Partitions: the range's start (0), its end (1), inside it (between), before it (0), after it (1).
  it.each([
    ['11:30', 0],
    ['13:30', 1],
    ['12:30', 0.5],
    ['12:33', 0.525],
    ['11:00', 0],
    ['14:00', 1],
  ])('puts %s at %d of the range', (clock, share) => {
    expect(shareOf(at(clock), band.range)).toBeCloseTo(share, 10);
  });
});

describe('droppedAt the start handle', () => {
  // Partitions: the range's start, between two steps (below, above, and at the half), past the last step 15 minutes
  // before the end, and below the range.
  it.each([
    [0, '11:30'],
    [67 / 120, '12:35'],
    [68 / 120, '12:40'],
    [67.5 / 120, '12:40'],
    [1, '12:40'],
    [-0.1, '11:30'],
  ])('drops a share of %d at %s', (share, clock) => {
    expect(droppedAt('from', share, band)).toBe(clock);
  });
});

describe('droppedAt the end handle', () => {
  // Partitions: the range's end, below the first step 15 minutes after the start, at that step, and inside.
  it.each([
    [1, '13:30'],
    [0, '12:50'],
    [80 / 120, '12:50'],
    [0.75, '13:00'],
  ])('drops a share of %d at %s', (share, clock) => {
    expect(droppedAt('until', share, band)).toBe(clock);
  });
});

describe('stepped', () => {
  // Partitions: each handle up and down from a time between steps; a start handle at its last step (stays); a start
  // handle at the range's start (stays).
  it.each([
    ['from', 1, '12:35'],
    ['from', -1, '12:30'],
    ['until', 1, '13:00'],
    ['until', -1, '12:55'],
  ] as const)('moves the %s handle by %d to %s', (bound, direction, clock) => {
    expect(stepped(bound, direction, band)).toBe(clock);
  });

  it('keeps the start handle 15 minutes before the end', () => {
    // The stored band with its start moved to 12:40, the last step 15 minutes before 12:59.
    expect(stepped('from', 1, { ...band, startAt: at('12:40') })).toBe('12:40');
  });

  it('moves the start handle down from its last step', () => {
    // The stored band with its start moved to 12:40.
    expect(stepped('from', -1, { ...band, startAt: at('12:40') })).toBe('12:35');
  });

  it('keeps the start handle inside the range', () => {
    // The stored band moved to 11:30 to 12:00, its start at the range's start.
    expect(stepped('from', -1, { ...band, startAt: at('11:30'), endAt: at('12:00') })).toBe('11:30');
  });
});

describe('a band off the five-minute steps', () => {
  // Partitions: each handle stepped each way, and dragged past its limit each way, where the nearest step that keeps
  // 15 minutes to the other handle lies on the wrong side of the handle's own time (it stays) or on the right side.
  // The stored band with its two ends moved to 12:41 and 12:57, off the steps, inside the range 11:30 to 13:30.
  const offSteps = { ...band, startAt: at('12:41'), endAt: at('12:57') };

  it.each([
    ['from', 1, '12:41'],
    ['from', -1, '12:40'],
    ['until', 1, '13:00'],
    ['until', -1, '12:57'],
  ] as const)('steps the %s handle by %d to %s', (bound, direction, clock) => {
    expect(stepped(bound, direction, offSteps)).toBe(clock);
  });

  it.each([
    ['from', 1, '12:41'],
    ['from', -0.1, '11:30'],
    ['until', 0, '12:57'],
    ['until', 1.1, '13:30'],
  ] as const)('drops the %s handle dragged to a share of %d at %s', (bound, share, clock) => {
    expect(droppedAt(bound, share, offSteps)).toBe(clock);
  });
});

describe('clashes', () => {
  // Partitions: a fixed start (a busy stretch across it, one before it, one after the band), a fixed end (a busy
  // stretch across it), and neither fixed (nothing).
  const fromNoon = { from: '12:00', until: null };
  const band1215 = { startAt: at('12:15'), endAt: at('12:43') };

  it('keeps the part of a busy stretch after a fixed start', () => {
    expect(clashes([stretch('11:30', '12:15')], fromNoon, band1215)).toEqual([stretch('12:00', '12:15')]);
  });

  it('finds nothing in a busy stretch before a fixed start', () => {
    expect(clashes([stretch('11:30', '11:50')], fromNoon, band1215)).toEqual([]);
  });

  it('finds nothing in a busy stretch after the band when the end is not fixed', () => {
    expect(clashes([stretch('13:00', '13:30')], fromNoon, band1215)).toEqual([]);
  });

  it('keeps the part of a busy stretch before a fixed end', () => {
    expect(clashes([stretch('13:00', '13:30')], { from: null, until: '13:10' }, band)).toEqual([
      stretch('13:00', '13:10'),
    ]);
  });

  it('finds nothing when the window fixes neither bound', () => {
    const lanes = band.lanes.flatMap(({ busy }) => busy);

    expect(clashes(lanes, { from: null, until: null }, band)).toEqual([]);
  });
});

describe('clockOf', () => {
  // Partitions: a time with Korea's offset.
  it('reads the clock of a time', () => {
    expect(clockOf(band.startAt)).toBe('12:33');
  });
});
