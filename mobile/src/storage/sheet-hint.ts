/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';

// Whether a first-time hint was shown on this phone: the answer sheet's, "손잡이를 올리면 더 볼 수 있어요" (P04 ticket 61),
// or picking's, "지도의 얼굴을 눌러도 골라져요" (P04 ticket 64). Each shows once a phone, whoever is signed in.

export type HintName = 'sheet' | 'pick';

function keyOf(name: HintName): string {
  return `snunow.${name}-hint`;
}

export async function hintSeen(name: HintName): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(keyOf(name))) === 'seen';
  } catch {
    return true;
  }
}

export async function keepHintSeen(name: HintName): Promise<void> {
  try {
    await AsyncStorage.setItem(keyOf(name), 'seen');
  } catch {
    // Shown again next time.
  }
}
