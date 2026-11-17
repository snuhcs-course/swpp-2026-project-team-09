/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';

// Whether the User agreed, on this phone, that a timetable screenshot is sent to the main server to be read (P15-52).
// Asked before the first send; a sign-out leaves it as it is.

const KEY = 'snunow.timetable-reading-agreed';

export async function readingAgreed(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === 'yes';
  } catch {
    return false;
  }
}

export async function agreeToReading(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, 'yes');
  } catch {
    // Asked again next time.
  }
}
