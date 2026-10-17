/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QuestEntries, QuestPhoto } from '@/api/quest-parts-types';

// The photo and the tags the User entered for the Quests they made, by Quest id. The main server stores neither, so the
// phone keeps them and nobody else sees them (P06 spec, Mocks).

const KEY = 'snunow.quest-entries';
const NONE: QuestEntries = { photo: null, tags: [] };

function isPhoto(value: unknown): value is QuestPhoto {
  if (typeof value !== 'object' || value === null || !('kind' in value) || !('caption' in value)) {
    return false;
  }
  if (typeof value.caption !== 'string') {
    return false;
  }
  if (value.kind === 'picked') {
    return 'uri' in value && typeof value.uri === 'string';
  }
  return (
    value.kind === 'drawn' &&
    'tint' in value &&
    typeof value.tint === 'string' &&
    'icon' in value &&
    (value.icon === 'flag' || value.icon === 'users')
  );
}

function isEntries(value: unknown): value is QuestEntries {
  return (
    typeof value === 'object' &&
    value !== null &&
    'photo' in value &&
    (value.photo === null || isPhoto(value.photo)) &&
    'tags' in value &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === 'string')
  );
}

// What the phone keeps; an entry this version cannot read counts as none.
export async function readQuestEntries(): Promise<Partial<Record<string, QuestEntries>>> {
  const stored = await AsyncStorage.getItem(KEY);
  if (stored === null) {
    return {};
  }
  try {
    const value: unknown = JSON.parse(stored);
    if (typeof value !== 'object' || value === null) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(value).filter((entry): entry is [string, QuestEntries] => isEntries(entry[1])),
    );
  } catch {
    return {};
  }
}

// Changes wait for each other, so that two at once do not each write over what the other kept.
let lastChange: Promise<unknown> = Promise.resolve();

// Keeps what is given for the Quest, and what it had before for what is left out.
export function keepQuestEntries(questId: string, change: Partial<QuestEntries>): Promise<QuestEntries> {
  const written = lastChange.then(async () => {
    const all = await readQuestEntries();
    const entries = { ...(all[questId] ?? NONE), ...change };
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...all, [questId]: entries }));
    return entries;
  });
  lastChange = written.catch(() => null);
  return written;
}
