/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { myUserId } from '@/auth/sign-in';
import type { FirstRunCard } from '@/features/first-run/rules';

// The first run's cards that still wait for each User who finished Onboarding on this phone (P05 ticket 09). A User
// with no list, as one who finished it before this version or on another phone, is outside the first run; one whose
// cards have all been answered or skipped keeps an empty list. Without a signed-in User nothing is read or kept.

const KEY = 'snunow.first-run';

const CARDS = new Set<unknown>(['timetable', 'interests', 'friend']);

function isCard(value: unknown): value is FirstRunCard {
  return CARDS.has(value);
}

// "snunow.first-run:{userId}", or null without a signed-in User.
function userKey(): string | null {
  const userId = myUserId();
  return userId === '' ? null : `${KEY}:${userId}`;
}

async function readUnder(stored: string | null): Promise<FirstRunCard[] | null> {
  const value = stored === null ? null : await AsyncStorage.getItem(stored);
  if (value === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((card) => isCard(card)) : null;
  } catch {
    return null;
  }
}

export function readFirstRun(): Promise<FirstRunCard[] | null> {
  return readUnder(userKey());
}

// Changes wait for each other, so that two at once do not each write over what the other kept.
let lastChange: Promise<unknown> = Promise.resolve();

function change(next: (cards: FirstRunCard[] | null) => FirstRunCard[] | null): Promise<void> {
  const stored = userKey();
  const written = lastChange.then(async () => {
    if (stored === null) {
      return;
    }
    const cards = next(await readUnder(stored));
    if (cards !== null) {
      await AsyncStorage.setItem(stored, JSON.stringify(cards));
    }
  });
  lastChange = written.catch(() => null);
  return written;
}

// At the end of Onboarding on this phone: every card waits.
export function startFirstRun(): Promise<void> {
  return change(() => ['timetable', 'interests', 'friend']);
}

// The card was answered or skipped. A User outside the first run stays outside it.
export function answerFirstRunCard(card: FirstRunCard): Promise<void> {
  return change((cards) => (cards === null ? null : cards.filter((each) => each !== card)));
}
