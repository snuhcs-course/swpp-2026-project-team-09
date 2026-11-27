/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { dayAndClock } from '@/korea-time';

// The one rule for a time with its day (P06 ticket 26). Now is Tuesday 2026-11-17 at 11:50 in Korea; the words count
// Korea's calendar days, not UTC's.
const NOW = new Date('2026-11-17T11:50:00+09:00');

describe('dayAndClock', () => {
  it.each([
    ['later today', '2026-11-17T23:30:00+09:00', '오늘 23:30'],
    ['tomorrow', '2026-11-18T14:00:00+09:00', '내일 14:00'],
    ['tomorrow just after midnight', '2026-11-18T00:10:00+09:00', '내일 00:10'],
    ['the day after tomorrow, by its date', '2026-11-19T14:00:00+09:00', '11/19(목) 14:00'],
    ['a day before today, by its date', '2026-11-16T18:00:00+09:00', '11/16(월) 18:00'],
    ['a day of another year, without the year', '2027-01-04T09:30:00+09:00', '1/4(월) 09:30'],
  ])('says %s', (_case, at, words) => {
    expect(dayAndClock(at, NOW)).toBe(words);
  });

  it('reads the day in Korea for a time sent in UTC', () => {
    expect(dayAndClock('2026-11-17T15:30:00Z', NOW)).toBe('내일 00:30');
  });
});
