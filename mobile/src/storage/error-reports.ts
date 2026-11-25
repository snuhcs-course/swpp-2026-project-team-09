/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';

// Whether the phone sends error reports, the switch "오류 보고 보내기" in 내 정보 (P08 ticket 03). It is the phone's, not
// the account's: kept under its own key, apart from what a sign-out, the end of a Session or the development setting
// for the first state clears, so that it holds before a sign-in and from one User to the next. On while nothing is
// kept.

const KEY = 'snunow.error-reports';

// Throws when the phone could not be read: the telemetry layer decides what that means.
export async function readErrorReports(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) !== 'off';
}

export async function keepErrorReports(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // The choice holds while the app runs; the next start reads what was kept before.
  }
}
