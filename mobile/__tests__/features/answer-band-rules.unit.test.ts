/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { TimeBand } from '@/api/assistant-types';
import { bandMoved } from '@/features/assistant/band-move';
import { droppedAt, shareOf, stepped } from '@/features/assistant/time-band';

// The rules a band moves by (P01 ticket 12): a seat booking's band carries the library's (30-minute steps, the room's
// shortest and longest length, no start before the earliest it takes today); a band without them moves by a meal's.
// Partitions: a booking's band at its bounds and inside them; a meal's band. Expected values: the library's rules for
// 7층 열람실 (an hour at least, six at most), on 2026-11-02 with 16:30 the earliest start.

type Moving = Pick<TimeBand, 'range' | 'startAt' | 'endAt' | 'rules'>;

const DAY = '2026-11-02';
const at = (clock: string): string => `${DAY}T${clock}:00+09:00`;

const BOOKING: Moving = {
  range: { startAt: at('07:00'), endAt: at('23:00') },
  startAt: at('17:00'),
  endAt: at('18:00'),
  rules: { stepMinutes: 30, leastMinutes: 60, mostMinutes: 360, earliest: at('16:30') },
};

const MEAL: Moving = { range: BOOKING.range, startAt: BOOKING.startAt, endAt: BOOKING.endAt };

describe("a booking's band", () => {
  it('steps its end by 30 minutes, and not under its shortest length', () => {
    expect(stepped('until', 1, BOOKING)).toBe('18:30');
    expect(stepped('until', -1, BOOKING)).toBe('18:00');
  });

  it('starts no earlier than the earliest start, and ends no later than its longest length', () => {
    expect(stepped('from', -1, BOOKING)).toBe('16:30');
    expect(stepped('from', -1, { ...BOOKING, startAt: at('16:30') })).toBe('16:30');
    expect(droppedAt('until', 1, BOOKING)).toBe('23:00');
    expect(droppedAt('until', 1, { ...BOOKING, endAt: at('22:00'), startAt: at('16:30') })).toBe('22:30');
  });

  it('drops a handle on the nearest step', () => {
    expect(droppedAt('until', shareOf(at('18:40'), BOOKING.range), BOOKING)).toBe('18:30');
  });

  it('moves whole by steps, and not before the earliest start', () => {
    const twoHours = 120 / (16 * 60);
    expect(bandMoved(BOOKING, twoHours)).toEqual({ startAt: at('19:00'), endAt: at('20:00') });
    expect(bandMoved(BOOKING, -twoHours)).toEqual({ startAt: at('16:30'), endAt: at('17:30') });
  });
});

describe("a meal's band", () => {
  it('moves by 5-minute steps, as before', () => {
    expect(stepped('until', 1, MEAL)).toBe('18:05');
    expect(stepped('from', -1, MEAL)).toBe('16:55');
  });
});
