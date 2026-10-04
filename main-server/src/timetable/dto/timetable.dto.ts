import { Timetable, TimetableClass, Weekday } from '../../generated/prisma/client.js';

export interface OverlappedClassDto {
  id: string;
  courseName: string;
}

export interface TimetableClassDto {
  id: string;
  courseName: string;
  // In the order of the week, Monday first.
  weekdays: Weekday[];
  // `HH:MM`.
  startTime: string;
  endTime: string;
  placeId: string;
  room: string | null;
  // The other classes that share a weekday with this one and cross its time.
  overlaps: OverlappedClassDto[];
}

export interface TimetableDto {
  // `YYYY-MM-DD`.
  semesterFirstDay: string | null;
  semesterLastDay: string | null;
  // By their earliest weekday, then by start time.
  classes: TimetableClassDto[];
}

const WEEK = Object.values(Weekday);

// A `date` column holds the calendar day of the Date in UTC.
function calendarDay(date: Date | null | undefined): string | null {
  return date?.toISOString().slice(0, 10) ?? null;
}

// A class that ends as another starts does not overlap it.
function overlap(one: TimetableClass, other: TimetableClass): boolean {
  return (
    one.id !== other.id &&
    one.weekdays.some((weekday) => other.weekdays.includes(weekday)) &&
    one.startTime < other.endTime &&
    other.startTime < one.endTime
  );
}

function toTimetableClassDto(one: TimetableClass, classes: TimetableClass[]): TimetableClassDto {
  const { id, courseName, weekdays, startTime, endTime, placeId, room } = one;
  const overlaps = classes
    .filter((other) => overlap(one, other))
    .map((other) => ({ id: other.id, courseName: other.courseName }));
  return { id, courseName, weekdays, startTime, endTime, placeId, room, overlaps };
}

function earliestWeekday({ weekdays }: TimetableClass): number {
  return Math.min(...weekdays.map((weekday) => WEEK.indexOf(weekday)));
}

export function toTimetableDto(timetable: (Timetable & { classes: TimetableClass[] }) | null): TimetableDto {
  const classes = (timetable?.classes ?? []).toSorted(
    (one, other) => earliestWeekday(one) - earliestWeekday(other) || one.startTime.localeCompare(other.startTime),
  );
  return {
    semesterFirstDay: calendarDay(timetable?.semesterFirstDay),
    semesterLastDay: calendarDay(timetable?.semesterLastDay),
    classes: classes.map((one) => toTimetableClassDto(one, classes)),
  };
}
