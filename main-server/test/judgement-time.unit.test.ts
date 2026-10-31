/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { isWrittenClock, isWrittenDay, readJudgedTime, writtenDays } from '../src/global-events/judgement-time.js';

const NOW = new Date('2026-11-01T12:00:00+09:00');

function timeOf(value: string): NonNullable<ReturnType<typeof readJudgedTime>> {
  const time = readJudgedTime(value);
  if (time === null) {
    throw new Error(`${value} is no time`);
  }
  return time;
}

describe('readJudgedTime', () => {
  it('reads a time in Korea, with its weekday', () => {
    expect(timeOf('2026-11-05T14:30')).toMatchObject({
      at: new Date('2026-11-05T05:30:00Z'),
      clock: { hour: 14, minute: 30 },
      weekday: '목',
    });
  });

  it('reads a day alone at its start, without a clock', () => {
    expect(timeOf('2026-11-05')).toMatchObject({ at: new Date('2026-11-04T15:00:00Z'), clock: null });
  });

  it.each(['2026-02-30T10:00', '2026-11-05T25:00', '11월 5일', '2026-11-05 14:00', ''])('refuses %s', (value) => {
    expect(readJudgedTime(value)).toBeNull();
  });
});

describe('writtenDays', () => {
  it.each([
    ['2026. 11. 5.(목) 14:00', { year: 2026, month: 11, day: 5, weekday: '목' }],
    ['2026.11.05. 14:00 ~ 2026.11.05. 16:00', { year: 2026, month: 11, day: 5, weekday: null }],
    ['2026-11-05', { year: 2026, month: 11, day: 5, weekday: null }],
    ['2026년 11월 5일 목요일', { year: 2026, month: 11, day: 5, weekday: '목' }],
    ['11월 5일(목요일)', { year: null, month: 11, day: 5, weekday: '목' }],
    ['11/5(목)', { year: null, month: 11, day: 5, weekday: '목' }],
    ['26.11.5', { year: 2026, month: 11, day: 5, weekday: null }],
  ])('reads %s', (line, expected) => {
    expect(writtenDays(line)[0]).toEqual(expected);
  });

  it('does not read 일시 after a day as its weekday', () => {
    expect(writtenDays('11월 5일 일시')[0]?.weekday).toBeNull();
  });

  it('does not take a time for a day', () => {
    expect(writtenDays('10.13.14:00')[0]).toMatchObject({ month: 10, day: 13 });
  });
});

describe('isWrittenDay', () => {
  it('takes a day without a year as the one nearest to now', () => {
    const [written] = writtenDays('1월 5일');
    if (written === undefined) {
      throw new Error('No day');
    }

    expect(isWrittenDay(written, timeOf('2027-01-05'), NOW)).toBe(true);
    expect(isWrittenDay(written, timeOf('2026-01-05'), NOW)).toBe(false);
  });

  it('holds a written year to the time', () => {
    const [written] = writtenDays('2027년 11월 5일');
    if (written === undefined) {
      throw new Error('No day');
    }

    expect(isWrittenDay(written, timeOf('2026-11-05'), NOW)).toBe(false);
  });
});

describe('isWrittenClock', () => {
  it.each([
    ['14:00', 14, 0],
    ['2026.11.05. 10:30', 10, 30],
    ['오후 2시', 14, 0],
    ['오후 2시 30분', 14, 30],
    ['오후 2시 반', 14, 30],
    ['오전 10시', 10, 0],
    ['오전 12시', 0, 0],
    ['오후 12시', 12, 0],
    ['정오', 12, 0],
    ['2:00 PM', 14, 0],
    // 오후 carried to a later time, and hours without either word, read as daytime.
    ['오후 2시~4시', 16, 0],
    ['2시', 14, 0],
    ['9시', 9, 0],
    ['8시', 20, 0],
  ])('%s holds %i:%i', (line, hour, minute) => {
    expect(isWrittenClock(line, { hour, minute })).toBe(true);
  });

  it.each([
    ['14:00', 15, 0],
    ['14:00', 14, 30],
    ['오후 2시', 2, 0],
    ['오전 2시', 14, 0],
    ['2시', 2, 0],
    // A date is no time.
    ['11.14', 11, 14],
    ['25시', 1, 0],
  ])('%s does not hold %i:%i', (line, hour, minute) => {
    expect(isWrittenClock(line, { hour, minute })).toBe(false);
  });
});
