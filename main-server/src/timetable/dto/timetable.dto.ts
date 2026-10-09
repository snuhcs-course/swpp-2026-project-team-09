// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #37
import { Prisma, Weekday } from '../../generated/prisma/client.js';
import { cross } from './save-class.dto.js';

// With each time's Place in full, which Class Quests show. Two times of a class never share a weekday and a start.
export const CLASS_INCLUDE = {
  times: { include: { place: true }, orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }] },
} satisfies Prisma.TimetableClassInclude;

// A class with its times in the order of the week, Monday first, then by start.
export type StoredClass = Prisma.TimetableClassGetPayload<{ include: typeof CLASS_INCLUDE }>;

export interface OverlappedClassDto {
  id: string;
  courseName: string;
}

export interface ClassTimeDto {
  id: string;
  weekday: Weekday;
  // `HH:MM`.
  startTime: string;
  endTime: string;
  placeId: string | null;
  room: string | null;
}

export interface TimetableClassDto {
  id: string;
  courseName: string;
  times: ClassTimeDto[];
  // The other classes with a time that crosses one of this one's.
  overlaps: OverlappedClassDto[];
}

function overlap(one: StoredClass, other: StoredClass): boolean {
  return one.id !== other.id && one.times.some((time) => other.times.some((otherTime) => cross(time, otherTime)));
}

// The classes in the order of their first time in the week, each with the classes it overlaps.
export function toTimetableDto(classes: StoredClass[]): TimetableClassDto[] {
  const week = Object.values(Weekday);
  const firstTime = ({ times: [first] }: StoredClass): string =>
    first === undefined ? '' : `${week.indexOf(first.weekday)} ${first.startTime}`;
  const sorted = classes.toSorted(
    (one, other) => firstTime(one).localeCompare(firstTime(other)) || one.id.localeCompare(other.id),
  );
  return sorted.map((one) => ({
    id: one.id,
    courseName: one.courseName,
    times: one.times.map(({ id, weekday, startTime, endTime, placeId, room }) => ({
      id,
      weekday,
      startTime,
      endTime,
      placeId,
      room,
    })),
    overlaps: sorted
      .filter((other) => overlap(one, other))
      .map((other) => ({ id: other.id, courseName: other.courseName })),
  }));
}
