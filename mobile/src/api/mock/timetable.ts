/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { ApiError } from '@/api/errors';
import type { ClassSave, ClassTime, Place, TimetableClass, Weekday } from '@/api/types';
import { PLACES } from './data/places';
import { CLASSES } from './data/timetable';

// The User's classes in the mock, kept in memory while the app runs, in the main server's order, with its overlaps
// and its refusals (`main-server/README.md`, "Timetable" and "Places").

const MOST_CLASSES = 15;
const WEEK: readonly Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

type Kept = Omit<TimetableClass, 'overlaps'>;

let classes: Kept[] = [];
let made = 0;

// Back to the frame's four classes, for a test.
export function resetMockTimetable(): void {
  classes = CLASSES.map(({ id, courseName, times }) => ({ id, courseName, times }));
  made = 0;
}

resetMockTimetable();

function byWeek(one: Omit<ClassTime, 'id'>, other: Omit<ClassTime, 'id'>): number {
  return WEEK.indexOf(one.weekday) - WEEK.indexOf(other.weekday) || one.startTime.localeCompare(other.startTime);
}

// Times that touch do not cross.
function cross(one: ClassTime, other: ClassTime): boolean {
  return one.weekday === other.weekday && one.startTime < other.endTime && other.startTime < one.endTime;
}

function withOverlaps(lesson: Kept): TimetableClass {
  const overlaps = classes
    .filter(
      (other) => other.id !== lesson.id && other.times.some((time) => lesson.times.some((own) => cross(own, time))),
    )
    .map(({ id, courseName }) => ({ id, courseName }));
  return { ...lesson, overlaps };
}

function keptOf(id: string, save: ClassSave): Kept {
  if (save.times.some(({ placeId }) => placeId !== null && !PLACES.some((place) => place.id === placeId))) {
    throw new ApiError(404, 'PLACE_NOT_FOUND');
  }
  made += 1;
  const times = save.times.toSorted(byWeek).map(({ weekday, startTime, endTime, placeId, room }, index) => ({
    id: `time-${made}-${index}`,
    weekday,
    startTime,
    endTime,
    placeId,
    room,
  }));
  return { id, courseName: save.courseName.trim(), times };
}

function put(lesson: Kept): TimetableClass {
  classes = [...classes.filter(({ id }) => id !== lesson.id), lesson].toSorted((one, other) => {
    const [first, second] = [one.times[0], other.times[0]];
    return first === undefined || second === undefined ? 0 : byWeek(first, second);
  });
  return withOverlaps(lesson);
}

function knownOrRefuse(classId: string): void {
  if (!classes.some(({ id }) => id === classId)) {
    throw new ApiError(404, 'CLASS_NOT_FOUND');
  }
}

function matches(place: Place, words: string): boolean {
  const number = words.replace(/동$/u, '');
  return place.name.toLowerCase().includes(words.toLowerCase()) || place.number === number;
}

export const mockTimetable = {
  listClasses: (): TimetableClass[] => classes.map((lesson) => withOverlaps(lesson)),
  addClass: (save: ClassSave): TimetableClass => {
    if (classes.length >= MOST_CLASSES) {
      throw new ApiError(409, 'TIMETABLE_FULL');
    }
    return put(keptOf(`class-${made + 1}`, save));
  },
  replaceClass: (classId: string, save: ClassSave): TimetableClass => {
    knownOrRefuse(classId);
    return put(keptOf(classId, save));
  },
  deleteClass: (classId: string): void => {
    knownOrRefuse(classId);
    classes = classes.filter(({ id }) => id !== classId);
  },
  searchPlaces: (words: string): Place[] => PLACES.filter((place) => matches(place, words.trim())),
};
