/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';

// Lists of ids that the phone keeps for a mocked part the main server stores nothing of: the posts the User hid, the
// official recruiting they joined and the people they asked. Nobody else sees them (P06 spec, Mocks).

export type KeptIdsKey = 'snunow.hidden-posts' | 'snunow.joined-official' | 'snunow.asked-seekers';

// What the phone keeps under the key; a list this version cannot read counts as none.
export async function readKeptIds(key: KeptIdsKey): Promise<string[]> {
  const stored = await AsyncStorage.getItem(key);
  if (stored === null) {
    return [];
  }
  try {
    const value: unknown = JSON.parse(stored);
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

// Changes wait for each other, so that two at once do not each write over what the other kept.
let lastChange: Promise<unknown> = Promise.resolve();

// Adds the id to the list, once.
export function keepId(key: KeptIdsKey, id: string): Promise<void> {
  const written = lastChange.then(async () => {
    const ids = await readKeptIds(key);
    if (!ids.includes(id)) {
      await AsyncStorage.setItem(key, JSON.stringify([...ids, id]));
    }
  });
  lastChange = written.catch(() => null);
  return written;
}
