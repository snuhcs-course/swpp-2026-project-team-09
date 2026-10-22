/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ClassTime, TimetableClass, Weekday } from '@/api/types';
import { openingHour, toWeekBlocks, weekHours } from '@/features/timetable/adapter';

// The week on 내 정보: its blocks are whole, and its hours run from 09 to 22 or wider.

function lesson(id: string, weekday: Weekday, startTime: string, endTime: string): TimetableClass {
  const time: ClassTime = { id: `${id}-1`, weekday, startTime, endTime, placeId: null, room: null };
  return { id, courseName: id, times: [time], overlaps: [] };
}

describe('the week', () => {
  it('runs from 09 to 22 and opens at 09 without classes', () => {
    expect(weekHours([])).toEqual({ first: 9, last: 22 });
    expect(openingHour([], 9)).toBe(9);
  });

  it('keeps an evening class whole and opens at the earliest class', () => {
    const blocks = toWeekBlocks(
      [lesson('저녁', 'thursday', '19:00', '21:00'), lesson('오후', 'monday', '13:30', '15:00')],
      [],
    );

    expect(blocks.map(({ day, start, end }) => ({ day, start, end }))).toEqual([
      { day: 3, start: 19, end: 21 },
      { day: 0, start: 13.5, end: 15 },
    ]);
    expect(weekHours(blocks)).toEqual({ first: 9, last: 22 });
    expect(openingHour(blocks, 9)).toBe(13);
  });

  it('widens to a class that starts before 09 or ends after 22, and leaves out the weekend', () => {
    const blocks = toWeekBlocks(
      [
        lesson('늦은', 'friday', '21:00', '22:30'),
        lesson('이른', 'tuesday', '08:00', '09:15'),
        lesson('주말', 'saturday', '06:00', '23:59'),
      ],
      [],
    );

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ start: 21, end: 22.5 });
    expect(weekHours(blocks)).toEqual({ first: 8, last: 23 });
    expect(openingHour(blocks, 8)).toBe(8);
  });
});
