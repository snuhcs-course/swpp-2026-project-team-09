/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// Partitions: the 행사 tab's date column for an event ahead, today, in Korea's calendar, and for one running now at the
// edges of its start and its end. Expected values: P15 ticket 54's rule, worked by hand in Korea's time.

import { eventDate, eventHours } from '@/features/events/adapter';

// 13:00 in Korea on Tuesday 6 October 2026.
const NOW = new Date('2026-10-06T13:00:00+09:00');

describe('eventDate, the date column', () => {
  it.each([
    ['today', '2026-10-06T18:00:00+09:00', { day: '6', line: '10월 · 오늘' }],
    ['tomorrow, just after midnight', '2026-10-07T00:00:00+09:00', { day: '7', line: '10월 · 내일' }],
    ['a later day, by its weekday', '2026-10-08T17:00:00+09:00', { day: '8', line: '10월 · 목' }],
    // 08:00 on the 1st in Korea is the 31st in UTC.
    ['the day in Korea', '2026-11-01T08:00:00+09:00', { day: '1', line: '11월 · 일' }],
    ['a start already past, without an end', '2026-10-05T00:00:00+09:00', { day: '5', line: '10월 · 월' }],
  ])('%s', (_, startsAt, expected) => {
    expect(eventDate({ startsAt, endsAt: null }, NOW)).toEqual(expected);
  });
});

// An event that has begun and not ended shows today, so that 오늘 shows no past day; one ended or not begun, its start.
describe('eventDate of an event running now', () => {
  const TODAY = { day: '6', line: '10월 · 오늘' };

  it.each([
    ['an exhibition until 11월 30일', '2026-10-05T00:00:00+09:00', '2026-11-30T23:59:00+09:00', NOW],
    ['begun today, earlier', '2026-10-06T09:00:00+09:00', '2026-10-06T18:00:00+09:00', NOW],
    ['starting this minute', '2026-10-06T13:00:00+09:00', '2026-10-06T18:00:00+09:00', NOW],
    [
      'a night across midnight, after it',
      '2026-10-05T22:00:00+09:00',
      '2026-10-06T02:00:00+09:00',
      new Date('2026-10-06T01:00:00+09:00'),
    ],
  ])('%s → today', (_, startsAt, endsAt, now) => {
    expect(eventDate({ startsAt, endsAt }, now)).toEqual(TODAY);
  });

  it.each([
    ['ended yesterday', '2026-10-01T00:00:00+09:00', '2026-10-05T23:59:00+09:00', { day: '1', line: '10월 · 목' }],
    ['ending this minute', '2026-10-05T10:00:00+09:00', '2026-10-06T13:00:00+09:00', { day: '5', line: '10월 · 월' }],
    ['a night across midnight, not begun', '2026-10-06T22:00:00+09:00', '2026-10-07T02:00:00+09:00', TODAY],
    ['tomorrow', '2026-10-07T10:00:00+09:00', '2026-10-07T12:00:00+09:00', { day: '7', line: '10월 · 내일' }],
  ])('%s → its start', (_, startsAt, endsAt, expected) => {
    expect(eventDate({ startsAt, endsAt }, NOW)).toEqual(expected);
  });

  // 08:30 on the 7th in Korea is still the 6th in UTC.
  it('today in Korea, the day before in UTC', () => {
    const now = new Date('2026-10-06T23:30:00.000Z');
    const exhibition = { startsAt: '2026-10-05T00:00:00+09:00', endsAt: '2026-11-30T23:59:00+09:00' };
    expect(eventDate(exhibition, now)).toEqual({ day: '7', line: '10월 · 오늘' });
  });

  it('keeps the hours beside the place saying until when', () => {
    expect(eventHours({ startsAt: '2026-10-05T00:00:00+09:00', endsAt: '2026-11-30T23:59:00+09:00' })).toBe(
      '11월 30일까지',
    );
  });
});
