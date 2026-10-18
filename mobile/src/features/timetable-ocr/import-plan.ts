/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ClassSave } from '@/api/types';
import { checkedClasses } from '@/features/timetable/version-checks';
import { classSaves, compareTimes, type ReadClass } from './classes';
import type { Reading } from './read-timetable';

// What an import makes of a reading (P13 spec, "Importing"): the classes the main server takes, at most 15, the first
// by day and start, and the new version's name.

export const MOST_IMPORTED = 15;
const NAME_LENGTH = 20;

export interface ImportPlan {
  name: string;
  classes: ClassSave[];
  // More than 15 classes were left after the main server's rules, and only the first 15 are kept.
  cut: boolean;
  // Blocks the pipeline left out, and classes and times that break the main server's rules.
  leftOut: number;
}

function byFirstTime(one: ReadClass, other: ReadClass): number {
  const [first] = one.times.toSorted(compareTimes);
  const [second] = other.times.toSorted(compareTimes);
  if (first === undefined || second === undefined) {
    return Number(first === undefined) - Number(second === undefined);
  }
  return compareTimes(first, second);
}

// The plan for a reading, or null when it holds no class. `versionCount` names `새 시간표 N` without a title. The
// main server's rules are checked class by class before the cut to 15, so that a class they refuse leaves room for a
// later one.
export function importPlan(reading: Reading, versionCount: number): ImportPlan | null {
  if (reading.kind === 'none' || reading.classes.length === 0) {
    return null;
  }
  const valid: ClassSave[] = [];
  let leftOut = reading.leftOut.length;
  for (const save of classSaves(reading.classes.toSorted(byFirstTime))) {
    const checked = checkedClasses([save]);
    valid.push(...checked.classes);
    leftOut += checked.dropped.classes + checked.dropped.times;
  }
  if (valid.length === 0) {
    return null;
  }
  const named = reading.title?.trim().slice(0, NAME_LENGTH) ?? '';
  return {
    name: named === '' ? `새 시간표 ${versionCount + 1}` : named,
    classes: valid.slice(0, MOST_IMPORTED),
    cut: valid.length > MOST_IMPORTED,
    leftOut,
  };
}
