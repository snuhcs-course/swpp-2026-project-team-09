/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { koreaDayWord } from '@/korea-time';

// Now is Tuesday 2026-11-17 at 11:50 in Korea, a minute after midnight UTC on the 17th's other side included: the
// words count Korea's calendar days, not UTC's.
const NOW = new Date('2026-11-17T11:50:00+09:00');

describe('koreaDayWord', () => {
  it.each([
    ['2026-11-17T23:30:00+09:00', ''],
    ['2026-11-18T00:10:00+09:00', '내일(수)'],
    ['2026-11-19T14:00:00+09:00', '모레(목)'],
    ['2026-11-23T12:00:00+09:00', '11/23(월)'],
    ['2026-11-16T18:00:00+09:00', '어제(월)'],
    ['2026-11-10T09:30:00+09:00', '11/10(화)'],
  ])('says %s as "%s"', (at, words) => {
    expect(koreaDayWord(at, NOW)).toBe(words);
  });

  it('reads the day in Korea for a time sent in UTC', () => {
    expect(koreaDayWord('2026-11-17T15:30:00Z', NOW)).toBe('내일(수)');
  });
});
