/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClassSave } from '@/api/types';

// The User's timetable versions as this phone keeps them, until the main server keeps them. The current version's
// classes are the ones on the main server; `classes` is a version's copy from when it was last left, places as ids.
export interface KeptVersion {
  id: string;
  name: string;
  classes: ClassSave[];
}

// A switch that stopped before every class of the version switched to was on the main server: whether the main
// server's timetable was reset, and the classes still to add, each with the Idempotency-Key it is sent with every time.
export interface UnfinishedSwitch {
  reset: boolean;
  missing: { key: string; save: ClassSave }[];
}

export interface KeptVersions {
  // The User the versions belong to: another User signed in on this phone starts again.
  owner: string;
  currentId: string;
  versions: KeptVersion[];
  unfinished: UnfinishedSwitch | null;
}

const KEY = 'snunow.timetable-versions';

function isKeptVersions(value: unknown): value is KeptVersions {
  return (
    typeof value === 'object' &&
    value !== null &&
    'owner' in value &&
    typeof value.owner === 'string' &&
    'currentId' in value &&
    typeof value.currentId === 'string' &&
    'versions' in value &&
    Array.isArray(value.versions) &&
    value.versions.length > 0 &&
    'unfinished' in value
  );
}

// Null when the phone keeps none, or none this version can read.
export async function readKeptVersions(): Promise<KeptVersions | null> {
  const stored = await AsyncStorage.getItem(KEY);
  if (stored === null) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(stored);
    return isKeptVersions(value) ? value : null;
  } catch {
    return null;
  }
}

export async function keepVersions(versions: KeptVersions): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(versions));
}
