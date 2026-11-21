/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { clockWithDay, dayWordsFrom } from '../src/assistant/korea-time.js';

// A time is written with its day when it is not today (P05 ticket 07), in the app's day words (koreaDayWord). Now is
// Saturday 2026-11-21 at 03:52 in Korea.

const NOW = new Date('2026-11-21T03:52:00+09:00');

const at = (time: string): Date => new Date(`${time}+09:00`);

describe('A time with its day', () => {
  it.each([
    ['2026-11-21T18:00:00', '18:00'],
    ['2026-11-22T18:00:00', '내일(일) 18:00'],
    ['2026-11-23T12:21:00', '모레(월) 12:21'],
    ['2026-11-24T09:00:00', '11/24(화) 09:00'],
    ['2026-11-20T18:00:00', '어제(금) 18:00'],
  ])('writes %s as %s', (time, words) => {
    expect(clockWithDay(at(time), NOW)).toBe(words);
  });

  it('reads the day in Korea, not in UTC: 00:30 the next day is tomorrow', () => {
    expect(clockWithDay(at('2026-11-22T00:30:00'), NOW)).toBe('내일(일) 00:30');
  });

  // The plans round now up to the next minute: a question at 23:59:30 comes as 00:00, still asked on Saturday.
  it('reads a now rounded up to midnight as the day before it', () => {
    expect(clockWithDay(at('2026-11-22T18:00:00'), at('2026-11-22T00:00:00'))).toBe('내일(일) 18:00');
  });

  it('names a day of the week across a month, and nothing for today', () => {
    expect(dayWordsFrom('2026-12-01', NOW)).toBe('12/1(화)');
    expect(dayWordsFrom('2026-11-21', NOW)).toBe('');
  });
});
