/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ClassTime, TimetableClass, Weekday } from '@/api/types';
import { openingHour, toWeekBlocks, weekDays, weekHours } from '@/features/timetable/adapter';

// The week on 내 정보: its blocks are whole, its hours run from 09 to 22 or wider, and its days from 월 to 금 or to 토
// and 일.

// Wednesday, 2 for the week's index, at a time of day in hours.
const WEDNESDAY_AT = (hours: number): { day: number; hours: number } => ({ day: 2, hours });

function lesson(id: string, weekday: Weekday, startTime: string, endTime: string): TimetableClass {
  const time: ClassTime = { id: `${id}-1`, weekday, startTime, endTime, placeId: null, room: null };
  return { id, courseName: id, times: [time], overlaps: [] };
}

describe('the week', () => {
  it('runs from 09 to 22 and opens at 09 without classes', () => {
    expect(weekHours([])).toEqual({ first: 9, last: 22 });
    expect(openingHour([], 9, WEDNESDAY_AT(15))).toBe(9);
    expect(weekDays([])).toBe(5);
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
    expect(openingHour(blocks, 9, WEDNESDAY_AT(15))).toBe(13);
  });

  it('widens the start to 08 for a class at 08:00, and the end to 23 for one ending at 22:30', () => {
    const blocks = toWeekBlocks(
      [lesson('늦은', 'friday', '21:00', '22:30'), lesson('이른', 'tuesday', '08:00', '09:15')],
      [],
    );

    expect(blocks[0]).toMatchObject({ start: 21, end: 22.5 });
    expect(blocks[1]).toMatchObject({ start: 8, end: 9.25 });
    expect(weekHours(blocks)).toEqual({ first: 8, last: 23 });
    expect(openingHour(blocks, 8, WEDNESDAY_AT(15))).toBe(8);
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

describe('where the week opens', () => {
  const blocks = toWeekBlocks(
    [
      lesson('월요일', 'monday', '10:00', '11:00'),
      lesson('수요일 오후', 'wednesday', '14:00', '15:30'),
      lesson('수요일 저녁', 'wednesday', '19:00', '21:00'),
    ],
    [],
  );

  it('opens at the current hour when today has a class still to come', () => {
    expect(openingHour(blocks, 9, WEDNESDAY_AT(16.5))).toBe(16);
  });

  it("opens at the running class's start", () => {
    expect(openingHour(blocks, 9, WEDNESDAY_AT(20.25))).toBe(19);
  });

  it("opens at the week's earliest class when today's classes are over or there are none today", () => {
    expect(openingHour(blocks, 9, WEDNESDAY_AT(21.5))).toBe(10);
    expect(openingHour(blocks, 9, { day: 3, hours: 12 })).toBe(10);
  });

  it('opens no earlier than the first hour', () => {
    expect(openingHour(blocks, 9, WEDNESDAY_AT(7))).toBe(9);
  });
});
