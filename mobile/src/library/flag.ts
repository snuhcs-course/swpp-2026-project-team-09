/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';

// The one thing the app keeps of the library session: that the User logged in. It holds nothing from the site. The
// session itself stays in the web view's own cookie jar, which no app code reads.

const KEY = 'kwanjeong.loggedIn';

// Why the flag was cleared: the session ended under a call (`ended`), or the User or a sign-out ended it
// (`loggedOut`, "end the library session").
export type FlagCleared = 'ended' | 'loggedOut';

type Listener = (loggedIn: boolean, cleared: FlagCleared | null) => void;

const listeners = new Set<Listener>();

function tell(loggedIn: boolean, cleared: FlagCleared | null): void {
  for (const listener of listeners) {
    listener(loggedIn, cleared);
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
  tell(true, null);
}

// The views hear that the flag is cleared even when the phone's storage fails, so the hidden view unmounts.
export async function clearLibraryLoggedIn(cleared: FlagCleared = 'ended'): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } finally {
    tell(false, cleared);
  }
}
