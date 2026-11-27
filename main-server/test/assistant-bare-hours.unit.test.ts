/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { bareHourRule, nearestBareHour } from '../src/assistant/bare-hours.js';

// An hour said with no word for the half of the day is its nearest upcoming occurrence (P05 ticket 75): "7시에
// 공부할거야" at 01:10 was read as 19:00. One rule for every answer kind, in the chat's per-request system lines.

const at = (time: string): Date => new Date(`${time}+09:00`);

describe('The nearest upcoming bare hour', () => {
  it.each([
    ['2026-11-28T01:10:00', 7, 0, '07:00'],
    ['2026-11-28T08:00:00', 7, 0, '19:00'],
    ['2026-11-28T20:00:00', 7, 0, '내일 07:00'],
    ['2026-11-28T07:00:00', 7, 0, '07:00'],
    ['2026-11-28T07:05:00', 7, 0, '19:00'],
    ['2026-11-28T01:10:00', 12, 0, '12:00'],
    ['2026-11-28T13:00:00', 12, 0, '내일 00:00'],
    ['2026-11-28T01:10:00', 1, 30, '01:30'],
    ['2026-11-28T01:40:00', 1, 30, '13:30'],
    ['2026-11-28T23:30:00', 11, 0, '내일 11:00'],
  ])('at %s reads %s시 %s분 as %s', (now, hour, minute, reading) => {
    expect(nearestBareHour(hour, minute, at(now))).toBe(reading);
  });
});

describe('The bare-hour line the model reads', () => {
  it.each([
    ['2026-11-28T01:10:00', '7시 07:00'],
    ['2026-11-28T08:00:00', '7시 19:00'],
    ['2026-11-28T20:00:00', '7시 내일 07:00'],
  ])('at %s gives %s', (now, reading) => {
    expect(bareHourRule(at(now))).toContain(reading);
  });

  it('gives every hour from 1시 to 12시, read from now', () => {
    expect(bareHourRule(at('2026-11-28T01:10:00'))).toContain(
      '1시 13:00, 2시 02:00, 3시 03:00, 4시 04:00, 5시 05:00, 6시 06:00, 7시 07:00, 8시 08:00, 9시 09:00, 10시 10:00, 11시 11:00, 12시 12:00',
    );
  });

  it('keeps minutes still ahead in this hour: 1시 반 at 01:10 is 01:30', () => {
    expect(bareHourRule(at('2026-11-28T01:10:00'))).toContain('1시 반 01:30');
  });

  it('lets a word for the half of the day or a 24-hour time win', () => {
    const rule = bareHourRule(at('2026-11-28T01:10:00'));
    expect(rule).toContain('저녁 7시 is 19:00');
    expect(rule).toContain('19시');
  });

  it('leaves an hour on another day named alone', () => {
    expect(bareHourRule(at('2026-11-28T01:10:00'))).toContain('내일 7시');
  });
});
