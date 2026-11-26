/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { READING_ROOM } from '@/api/mock/data/library';
import { handlesOutside } from '@/features/assistant/time-band';
import type { Slot } from '@/library/cards/payloads';
import { bookingBandOf } from '@/screens/main/answer/booking-band';

// The range of a seat booking's time card (P01 ticket 16): today, from now floored to the hour to the closing time, at
// least 4 hours wide and never before opening; another day, opening to closing. It is the range of the moment the
// answer came, kept while the card is open. And a band too short for its two handles has them drawn outside it.
// Expected values: 7층 열람실, open 07:00–23:00, on 2026-11-02.

const DAY = '2026-11-02';

function kst(clock: string, date = DAY): Date {
  return new Date(`${date}T${clock}:00+09:00`);
}

function rangeOf(slot: Slot, now: Date, shownAt?: Date): string[] {
  const band = bookingBandOf(slot, READING_ROOM, [], now, shownAt);
  return [band.range.startAt.slice(11, 16), band.range.endAt.slice(11, 16)];
}

describe("a seat booking's time card range", () => {
  it('runs from now floored to the hour to closing in the morning', () => {
    expect(rangeOf({ date: DAY, start: '09:30', minutes: 60 }, kst('09:10'))).toEqual(['09:00', '23:00']);
  });

  it('runs from now floored to the hour to closing in the afternoon', () => {
    expect(rangeOf({ date: DAY, start: '15:30', minutes: 180 }, kst('14:20'))).toEqual(['14:00', '23:00']);
  });

  it('keeps 4 hours when less is left, starting earlier', () => {
    expect(rangeOf({ date: DAY, start: '22:30', minutes: 30 }, kst('22:10'))).toEqual(['19:00', '23:00']);
  });

  it('never starts before opening', () => {
    expect(rangeOf({ date: DAY, start: '07:00', minutes: 60 }, kst('05:30'))).toEqual(['07:00', '23:00']);
  });

  it('runs from opening to closing on another day', () => {
    expect(rangeOf({ date: '2026-11-03', start: '10:00', minutes: 60 }, kst('14:20'))).toEqual(['07:00', '23:00']);
  });

  it('keeps the range of the moment it was shown across an hour, while its now moves on', () => {
    const slot = { date: DAY, start: '15:00', minutes: 60 };
    const band = bookingBandOf(slot, READING_ROOM, [], kst('14:05'), kst('13:50'));

    expect(rangeOf(slot, kst('14:05'), kst('13:50'))).toEqual(['13:00', '23:00']);
    expect(band.now).toBe(kst('14:05').toISOString());
  });
});

describe("a band's handles", () => {
  const range = { startAt: `${DAY}T07:00:00+09:00`, endAt: `${DAY}T23:00:00+09:00` };
  const hour = { startAt: `${DAY}T09:00:00+09:00`, endAt: `${DAY}T10:00:00+09:00` };

  it('are drawn outside a band narrower than the two of them, as measured on the track', () => {
    // An hour of 16 is 31 points wide on a track of 496, 33 on one of 528; the two handles are 32.
    expect(handlesOutside(hour, range, 16 * 31)).toBe(true);
    expect(handlesOutside(hour, range, 16 * 33)).toBe(false);
  });

  it('are drawn on its ends before the track is measured', () => {
    expect(handlesOutside(hour, range, 0)).toBe(false);
  });
});
