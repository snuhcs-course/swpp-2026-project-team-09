/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { myUserId } from '@/auth/sign-in';
import type { Layers } from '@/screens/main/layers';

// Which of the map's layers, 공부공간, 셔틀버스 and 식당, the User left on, so that they start so on the next start of
// the app (P06 ticket 03). Each User who signs in on the phone has their own; without a signed-in User nothing is read
// or kept.

const KEY = 'snunow.map-layers';
const ALL_OFF: Layers = { dining: false, shuttle: false, study: false };

// "snunow.map-layers:{userId}", or null without a signed-in User.
function userKey(): string | null {
  const userId = myUserId();
  return userId === '' ? null : `${KEY}:${userId}`;
}

function layersOf(value: string | null): Layers {
  if (value === null) {
    return ALL_OFF;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) {
      return ALL_OFF;
    }
    return {
      dining: 'dining' in parsed && parsed.dining === true,
      shuttle: 'shuttle' in parsed && parsed.shuttle === true,
      study: 'study' in parsed && parsed.study === true,
    };
  } catch {
    return ALL_OFF;
  }
}

// What the phone keeps for the signed-in User. Nothing kept, a failed read and what this version cannot read are all
// off; it is never refused.
export async function readMapLayers(): Promise<Layers> {
  const stored = userKey();
  try {
    return layersOf(stored === null ? null : await AsyncStorage.getItem(stored));
  } catch {
    return ALL_OFF;
  }
}

// Changes wait for each other, so that the last one made is the one kept.
let lastChange: Promise<unknown> = Promise.resolve();

export function keepMapLayers(layers: Layers): Promise<void> {
  const stored = userKey();
  const written = lastChange.then(async () => {
    if (stored !== null) {
      await AsyncStorage.setItem(stored, JSON.stringify(layers));
    }
  });
  lastChange = written.catch(() => null);
  return written;
}
