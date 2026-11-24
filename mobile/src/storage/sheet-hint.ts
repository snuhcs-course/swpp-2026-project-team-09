/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';

// Whether the answer sheet's first-time hint, "손잡이를 올리면 더 볼 수 있어요", was shown on this phone (P04 ticket 61). It
// shows once a phone, whoever is signed in.

const KEY = 'snunow.sheet-hint';

export async function sheetHintSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === 'seen';
  } catch {
    return true;
  }
}

export async function keepSheetHintSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, 'seen');
  } catch {
    // Shown again next time.
  }
}
