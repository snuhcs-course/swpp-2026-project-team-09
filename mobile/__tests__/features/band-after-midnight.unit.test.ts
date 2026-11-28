/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-29  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { TimeBand } from '@/api/assistant-types';
import { bandMoved } from '@/features/assistant/band-move';
import { droppedAt, onBandDay, shareOf, stepped, windowClockOn } from '@/features/assistant/time-band';

// The user's phone, Saturday 2026-11-28 23:50 (P01 ticket 49): "지금 공부할 곳" gave a band wholly after midnight,
// "내일(일) 00:04–03:04 · 3시간", in a range of 23:35 to 03:30, and neither handle nor the band moved: #769 let no time
// go past 23:55 of the band's day. The main server reads a window's hours past 23 on the next day (P05 ticket 91), so a
// time is let go anywhere in the range, as hours past 24 counted from the band's day. Partitions: a band wholly after
// midnight, each end and the whole; a band across it, each end; a press where an end is; the clock written for a date.

const at = (clock: string, date = '2026-11-28'): string => `${date}T${clock}:00+09:00`;
const next = (clock: string): string => at(clock, '2026-11-29');
const RANGE = { startAt: at('23:35'), endAt: next('03:30') };
const AFTER: TimeBand = {
  range: RANGE,
  now: at('23:50'),
  lanes: [{ userId: 'me', name: '나', busy: [] }],
  startAt: next('00:04'),
  endAt: next('03:04'),
  text: '00:04–03:04 · 3시간',
};
const share = (time: string): number => shareOf(time, RANGE);
const ms = (time: string): number => Date.parse(time);

describe('A band wholly after midnight', () => {
  it('lets its end be dragged back, past midnight', () => {
    expect(droppedAt('until', share(next('02:00')), AFTER)).toBe('26:00');
  });

  it('lets its start be dragged on', () => {
    expect(droppedAt('from', share(next('01:00')), AFTER)).toBe('25:00');
  });

  it('moves whole', () => {
    expect(ms(bandMoved(AFTER, (20 * 60_000) / (ms(RANGE.endAt) - ms(RANGE.startAt))).startAt)).toBe(ms(next('00:24')));
  });

  it("steps by a screen reader's step", () => {
    expect(stepped('until', -1, AFTER)).toBe('27:00');
  });
});

// A study place open to 01:00: "19:15–01:00 · 5시간 45분", range 19:00–01:00 (#740's phone picture).
const ACROSS: TimeBand = {
  ...AFTER,
  range: { startAt: at('19:00'), endAt: next('01:00') },
  now: at('19:04'),
  startAt: at('19:15'),
  endAt: next('01:00'),
  text: '19:15–01:00 · 5시간 45분',
};

const across = (time: string): number => shareOf(time, ACROSS.range);

describe('A band across midnight', () => {
  it('lets its end be dragged back to 00:30, past midnight', () => {
    expect(droppedAt('until', across(next('00:30')), ACROSS)).toBe('24:30');
  });

  it('lets its start be dragged on past midnight', () => {
    expect(droppedAt('from', across(next('00:15')), ACROSS)).toBe('24:15');
  });

  it('keeps an end pressed where it is', () => {
    expect(droppedAt('until', 1, ACROSS)).toBe('25:00');
  });

  it('reads a clock past 23 on the next day', () => {
    expect(onBandDay('24:30', ACROSS)).toBe(next('00:30'));
    expect(onBandDay('23:30', ACROSS)).toBe(at('23:30'));
  });
});

describe('The clock written for a date', () => {
  it('counts hours past 24 from the date', () => {
    expect(windowClockOn('2026-11-28', next('00:30'))).toBe('24:30');
    expect(windowClockOn('2026-11-28', at('09:05'))).toBe('09:05');
    expect(windowClockOn('2026-11-29', next('00:30'))).toBe('00:30');
  });
});
