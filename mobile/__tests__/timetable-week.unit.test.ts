/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ClassTime, TimetableClass, Weekday } from '@/api/types';
import { toWeekBlocks, weekDays, weekHours } from '@/features/timetable/adapter';

// The week on 내 정보: its blocks are whole, its hours run from 09:00 to 22:00 (rows "09" to "21") or wider, and its
// days from 월 to 금 or to 토 and 일.

function lesson(id: string, weekday: Weekday, startTime: string, endTime: string): TimetableClass {
  const time: ClassTime = { id: `${id}-1`, weekday, startTime, endTime, placeId: null, room: null };
  return { id, courseName: id, times: [time], overlaps: [] };
}

describe('the week', () => {
  it('runs from 09 to 22 without classes', () => {
    expect(weekHours([])).toEqual({ first: 9, last: 22 });
    expect(weekDays([])).toBe(5);
  });

  it('keeps an evening class whole', () => {
    const blocks = toWeekBlocks(
      [lesson('저녁', 'thursday', '19:00', '21:00'), lesson('오후', 'monday', '13:30', '15:00')],
      [],
    );

    expect(blocks.map(({ day, start, end }) => ({ day, start, end }))).toEqual([
      { day: 3, start: 19, end: 21 },
      { day: 0, start: 13.5, end: 15 },
    ]);
    expect(weekHours(blocks)).toEqual({ first: 9, last: 22 });
  });

  it('widens the start to 08 for a class at 08:00, and the end to 23 for one ending at 22:30', () => {
    const blocks = toWeekBlocks(
      [lesson('늦은', 'friday', '21:00', '22:30'), lesson('이른', 'tuesday', '08:00', '09:15')],
      [],
    );

    expect(blocks[0]).toMatchObject({ start: 21, end: 22.5 });
    expect(blocks[1]).toMatchObject({ start: 8, end: 9.25 });
    expect(weekHours(blocks)).toEqual({ first: 8, last: 23 });
  });
});

describe('the ends of the week', () => {
  it('ends the week at 24 for a class that runs to 24:00 or 23:59', () => {
    const blocks = toWeekBlocks(
      [lesson('자정', 'monday', '22:00', '24:00'), lesson('막차', 'tuesday', '23:00', '23:59')],
      [],
    );

    expect(blocks).toMatchObject([{ start: 22, end: 24 }, { start: 23 }]);
    expect(weekHours(blocks)).toEqual({ first: 9, last: 24 });
  });

  it('leaves out a time that does not end after it starts, which the main server refuses', () => {
    expect(toWeekBlocks([lesson('자정 넘어', 'friday', '23:00', '01:00')], [])).toEqual([]);
  });

  it('adds 토 for a Saturday class, and 토 and 일 for a Sunday one', () => {
    const saturday = toWeekBlocks([lesson('토요일', 'saturday', '10:00', '13:00')], []);
    const sunday = toWeekBlocks([lesson('일요일', 'sunday', '10:00', '13:00')], []);

    expect(saturday).toMatchObject([{ day: 5, start: 10, end: 13 }]);
    expect(weekDays(saturday)).toBe(6);
    expect(sunday).toMatchObject([{ day: 6 }]);
    expect(weekDays(sunday)).toBe(7);
  });
});
