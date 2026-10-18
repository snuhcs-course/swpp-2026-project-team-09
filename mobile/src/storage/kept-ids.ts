/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { myUserId } from '@/auth/sign-in';

// Lists of ids that the phone keeps for a mocked part the main server stores nothing of: the posts the User hid, the
// official recruiting they joined and the people they asked. Nobody else sees them (P06 spec, Mocks). Each User who
// signs in on the phone has lists of their own; without a signed-in User nothing is read or kept.

export type KeptIdsKey = 'snunow.hidden-posts' | 'snunow.joined-official' | 'snunow.asked-seekers';

// "snunow.hidden-posts:{userId}", or null without a signed-in User.
function userKey(key: KeptIdsKey): string | null {
  const userId = myUserId();
  return userId === '' ? null : `${key}:${userId}`;
}

async function readUnder(stored: string | null): Promise<string[]> {
  const value = stored === null ? null : await AsyncStorage.getItem(stored);
  if (value === null) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

// What the phone keeps under the key for the signed-in User; a list this version cannot read counts as none.
export function readKeptIds(key: KeptIdsKey): Promise<string[]> {
  return readUnder(userKey(key));
}

// Changes wait for each other, so that two at once do not each write over what the other kept.
let lastChange: Promise<unknown> = Promise.resolve();

// Adds the id to the signed-in User's list, once.
export function keepId(key: KeptIdsKey, id: string): Promise<void> {
  const stored = userKey(key);
  const written = lastChange.then(async () => {
    if (stored === null) {
      return;
    }
    const ids = await readUnder(stored);
    if (!ids.includes(id)) {
      await AsyncStorage.setItem(stored, JSON.stringify([...ids, id]));
    }
  });
  lastChange = written.catch(() => null);
  return written;
}
