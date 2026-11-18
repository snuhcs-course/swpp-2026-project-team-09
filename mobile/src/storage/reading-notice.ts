/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';

// Whether the User agreed, on this phone, that a timetable screenshot is sent to the main server to be read (P15-52).
// Asked before the first send; forgotten at a sign-out or the end of a Session, so that the next User is asked
// (P15-52 review).

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

export async function forgetReadingAgreement(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Left as it was: the next send is not asked about.
  }
}
