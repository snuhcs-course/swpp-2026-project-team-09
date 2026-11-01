/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';

// The one thing the app keeps of the library session: that the User logged in. It holds nothing from the site. The
// session itself stays in the web view's own cookie jar, which no app code reads.

const KEY = 'kwanjeong.loggedIn';

type Listener = (loggedIn: boolean) => void;

const listeners = new Set<Listener>();

function tell(loggedIn: boolean): void {
  for (const listener of listeners) {
    listener(loggedIn);
  }
}

export function listenToLibraryFlag(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function isLibraryLoggedIn(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) !== null;
}

export async function markLibraryLoggedIn(): Promise<void> {
  await AsyncStorage.setItem(KEY, '1');
  tell(true);
}

export async function clearLibraryLoggedIn(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
  tell(false);
}
