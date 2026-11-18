/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { myUserId } from '@/auth/sign-in';

// Whether the tour of the bottom tabs waits for each User who finished Onboarding on this phone (P06 ticket 07, HE
// H7 and H8). `waiting` from the end of Onboarding until the tour is seen to its end or turned off for good, `seen`
// after it. A User with nothing kept, as one who finished Onboarding before this version or on another phone, is not
// shown it; 내 정보 replays it for anyone. Without a signed-in User nothing is read or kept.

export type TabTourKept = 'waiting' | 'seen';

const KEY = 'snunow.tab-tour';

// "snunow.tab-tour:{userId}", or null without a signed-in User.
function userKey(): string | null {
  const userId = myUserId();
  return userId === '' ? null : `${KEY}:${userId}`;
}

export async function readTabTour(): Promise<TabTourKept | null> {
  const stored = userKey();
  const value = stored === null ? null : await AsyncStorage.getItem(stored);
  return value === 'waiting' || value === 'seen' ? value : null;
}

async function keep(value: TabTourKept): Promise<void> {
  const stored = userKey();
  if (stored !== null) {
    await AsyncStorage.setItem(stored, value);
  }
}

// At the end of Onboarding on this phone.
export function startTabTour(): Promise<void> {
  return keep('waiting');
}

// Seen to its last step, or "다시 보지 않기".
export function endTabTour(): Promise<void> {
  return keep('seen');
}
