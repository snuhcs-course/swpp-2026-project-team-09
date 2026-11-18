/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { READING_ROOM } from '@/api/mock/data/library';
import {
  endMoved,
  fitted,
  isValidSpan,
  liveSlot,
  lengthWords,
  limitsOf,
  nowOn,
  shareOn,
  slotOf,
  spanOf,
  spanWords,
  wholeMoved,
} from '@/library/cards/slot-band';

// The rules of the seat book card's time band (P15 ticket 57).

// Monday 2026-11-02, 16:10 in Korea.
const NOW = new Date('2026-11-02T07:10:00.000Z');
const TODAY = '2026-11-02';
const TOMORROW = '2026-11-03';

const space = { ...READING_ROOM, hours: { open: '07:00', close: '23:00' }, minMinutes: 60, maxMinutes: 360 };

describe('the limits of the band', () => {
  it('starts today no earlier than the next 30 minutes, and on another day at opening', () => {
    expect(limitsOf(space, TODAY, NOW)).toEqual({
      open: 420,
      close: 1380,
      earliest: 990,
      step: 30,
      least: 60,
      most: 360,
    });
    expect(limitsOf(space, TOMORROW, NOW).earliest).toBe(420);
  });
});

describe('an end moved', () => {
  const limits = limitsOf(space, TODAY, NOW);
  const span = spanOf({ date: TODAY, start: '17:00', minutes: 60 });

  it('snaps to 30 minutes', () => {
    expect(endMoved(span, 'end', 1104, limits)).toEqual({ start: 1020, end: 1110 });
    expect(endMoved(span, 'end', 1094, limits)).toEqual({ start: 1020, end: 1080 });
  });

  it('keeps the start at the earliest, and the length at least the least', () => {
    expect(endMoved(span, 'start', 600, limits)).toEqual({ start: 990, end: 1080 });
    expect(endMoved(span, 'start', 1080, limits)).toEqual({ start: 1020, end: 1080 });
  });

  it('keeps the end before closing, and the length at most the most', () => {
    expect(endMoved(span, 'end', 1500, limits)).toEqual({ start: 1020, end: 1380 });
    const late = spanOf({ date: TODAY, start: '14:00', minutes: 60 });
    expect(endMoved(late, 'end', 1300, limitsOf(space, TOMORROW, NOW))).toEqual({ start: 840, end: 1200 });
  });
});

describe('the band moved whole', () => {
  const limits = limitsOf(space, TODAY, NOW);
  const span = spanOf({ date: TODAY, start: '17:00', minutes: 120 });

  it('keeps its length, by 30 minutes, between the earliest and closing', () => {
    expect(wholeMoved(span, 50, limits)).toEqual({ start: 1080, end: 1200 });
    expect(wholeMoved(span, -600, limits)).toEqual({ start: 990, end: 1110 });
    expect(wholeMoved(span, 600, limits)).toEqual({ start: 1260, end: 1380 });
  });
});

describe('the words and the track', () => {
  it('says the start, the end and the length', () => {
    expect(spanWords({ start: 840, end: 1200 })).toBe('14:00–20:00 · 6시간');
    expect(spanWords({ start: 1020, end: 1110 })).toBe('17:00–18:30 · 1시간 30분');
    expect(lengthWords(30)).toBe('30분');
  });

  it('places a time on the track and draws now on the band day only', () => {
    const limits = limitsOf(space, TODAY, NOW);
    expect(shareOn(900, limits)).toBe(0.5);
    expect(nowOn(TODAY, NOW, limits)).toBe(970);
    expect(nowOn(TOMORROW, NOW, limits)).toBeNull();
  });

  it('gives the slot back', () => {
    expect(slotOf(TODAY, { start: 1020, end: 1110 })).toEqual({ date: TODAY, start: '17:00', minutes: 90 });
  });
});

describe('a band that must stay bookable', () => {
  // Monday 2026-11-02, 15:10 in Korea: the earliest start is 15:30.
  const LATER = new Date('2026-11-02T06:10:00.000Z');

  it('moves a start in the past to the earliest, the end along with it', () => {
    const slot = { date: TODAY, start: '14:00', minutes: 60 };
    expect(liveSlot(space, slot, LATER)).toEqual({ date: TODAY, start: '15:30', minutes: 60 });
  });

  it('takes the end along when the earliest has passed the end less the least, never past the end', () => {
    const limits = limitsOf(space, TODAY, LATER);
    const span = spanOf({ date: TODAY, start: '14:00', minutes: 60 });
    const moved = endMoved(span, 'start', 840, limits);
    expect(moved).toEqual({ start: 930, end: 990 });
    expect(moved === null ? false : isValidSpan(moved, limits)).toBe(true);
  });

  it('follows a card left open across the half hour', () => {
    const slot = { date: TODAY, start: '16:30', minutes: 120 };
    expect(liveSlot(space, slot, NOW)).toEqual(slot);
    // 16:40: the next start is 17:00.
    expect(liveSlot(space, slot, new Date('2026-11-02T07:40:00.000Z'))).toEqual({
      date: TODAY,
      start: '17:00',
      minutes: 120,
    });
  });

  it('leaves no slot near closing when the least length no longer fits, and cuts a long one at closing', () => {
    // 22:10: the next start is 22:30, closing 23:00, the least an hour.
    const late = new Date('2026-11-02T13:10:00.000Z');
    expect(liveSlot(space, { date: TODAY, start: '21:00', minutes: 60 }, late)).toBeNull();
    const limits = limitsOf(space, TODAY, NOW);
    expect(fitted({ start: 1200, end: 1500 }, limits)).toEqual({ start: 1200, end: 1380 });
  });
});
