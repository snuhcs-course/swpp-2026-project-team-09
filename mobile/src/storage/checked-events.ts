/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { myUserId } from '@/auth/sign-in';

// The New Events the User checked on this phone, each id with when its event was published. The main server keeps
// none of it, so another phone of the User marks them again. Each User who signs in on the phone has their own; without
// a signed-in User nothing is read or kept. An id goes once its event was published `forMs` ago, when it would no
// longer be a New Event anyway.

const KEY = 'snunow.checked-events';

// The ids, with the time each event was published in ISO 8601.
export type CheckedEvents = Readonly<Record<string, string>>;

function userKey(): string | null {
  const userId = myUserId();
  return userId === '' ? null : `${KEY}:${userId}`;
}

function isChecked(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((at) => typeof at === 'string')
  );
}

async function readUnder(stored: string | null): Promise<CheckedEvents> {
  const value = stored === null ? null : await AsyncStorage.getItem(stored);
  if (value === null) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return isChecked(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

// Those of `checked` whose event was published less than `forMs` before `now`.
export function stillNew(checked: CheckedEvents, now: Date, forMs: number): CheckedEvents {
  return Object.fromEntries(
    Object.entries(checked).filter(([, publishedAt]) => now.getTime() - new Date(publishedAt).getTime() < forMs),
  );
}

// What the phone keeps for the signed-in User, without those gone by; what this version cannot read counts as none.
export async function readCheckedEvents(now: Date, forMs: number): Promise<CheckedEvents> {
  return stillNew(await readUnder(userKey()), now, forMs);
}

// Changes wait for each other, so that two at once do not each write over what the other kept.
let lastChange: Promise<unknown> = Promise.resolve();

// Adds the event to the signed-in User's checked ones, and drops those gone by.
export function keepChecked(id: string, publishedAt: string, now: Date, forMs: number): Promise<void> {
  const stored = userKey();
  const written = lastChange.then(async () => {
    if (stored === null) {
      return;
    }
    const kept = stillNew({ ...(await readUnder(stored)), [id]: publishedAt }, now, forMs);
    await AsyncStorage.setItem(stored, JSON.stringify(kept));
  });
  lastChange = written.catch(() => null);
  return written;
}
