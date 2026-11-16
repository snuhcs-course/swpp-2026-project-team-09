/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { myUserId } from '@/auth/sign-in';

// The items of the interest marks the User opened on this phone, by their cards' ids ("event:<id>", "party:<id>"),
// which no longer carry "!" (P05 ticket 13). Each User who signs in on the phone has a list of their own; without a
// signed-in User nothing is read or kept.

const KEY = 'snunow.opened-marks';
// The newest are kept: an item opened long ago has ended.
const MOST = 500;

// "snunow.opened-marks:{userId}", or null without a signed-in User.
function userKey(): string | null {
  const userId = myUserId();
  return userId === '' ? null : `${KEY}:${userId}`;
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

// What the phone keeps for the signed-in User; a list this version cannot read counts as none.
export function readOpenedMarks(): Promise<string[]> {
  return readUnder(userKey());
}

// Changes wait for each other, so that two at once do not each write over what the other kept.
let lastChange: Promise<unknown> = Promise.resolve();

// Adds the items to the signed-in User's list, each once.
export function keepOpenedMarks(ids: readonly string[]): Promise<void> {
  const stored = userKey();
  const written = lastChange.then(async () => {
    if (stored === null) {
      return;
    }
    const kept = await readUnder(stored);
    const added = ids.filter((id) => !kept.includes(id));
    if (added.length > 0) {
      await AsyncStorage.setItem(stored, JSON.stringify([...kept, ...added].slice(-MOST)));
    }
  });
  lastChange = written.catch(() => null);
  return written;
}
