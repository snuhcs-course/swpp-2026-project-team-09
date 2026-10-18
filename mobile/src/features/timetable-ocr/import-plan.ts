/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ClassSave, Weekday } from '@/api/types';
import type { ReadClass, ReadTable } from './read-timetable';

// What an import makes of the classes read (P13 spec, "Importing"): at most 15 classes, the first by day and start,
// and the new version's name.

export const MOST_IMPORTED = 15;
const NAME_LENGTH = 20;
const WEEK: readonly Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export interface ImportPlan {
  name: string;
  classes: ClassSave[];
  // More than 15 were read, and only the first 15 are kept.
  cut: boolean;
}

// "0-10:00" for a class's first time in the week, so that classes sort by day and then start.
function firstTime({ times }: ReadClass): string {
  const keys = times.map(({ weekday, start }) => `${WEEK.indexOf(weekday)}-${start.padStart(5, '0')}`);
  return keys.toSorted()[0] ?? '9';
}

// A time without a building keeps no room.
function saveOf({ name, times }: ReadClass): ClassSave {
  return {
    courseName: name,
    times: times.map(({ weekday, start, end, room, placeId }) => ({
      weekday,
      startTime: start,
      endTime: end,
      placeId,
      room: placeId === null ? null : room,
    })),
  };
}

// The plan for what was read, or null when no class was. `versionCount` names `새 시간표 N` without a title.
export function importPlan({ title, classes }: ReadTable, versionCount: number): ImportPlan | null {
  if (classes.length === 0) {
    return null;
  }
  const sorted = classes.toSorted((one, other) => firstTime(one).localeCompare(firstTime(other)));
  const named = title?.trim().slice(0, NAME_LENGTH) ?? '';
  return {
    name: named === '' ? `새 시간표 ${versionCount + 1}` : named,
    classes: sorted.slice(0, MOST_IMPORTED).map((read) => saveOf(read)),
    cut: classes.length > MOST_IMPORTED,
  };
}
