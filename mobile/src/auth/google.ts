/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-08  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { TurboModule } from 'react-native';
import { Platform, TurboModuleRegistry } from 'react-native';
import type { GoogleOneTapSignIn } from 'react-native-nitro-google-signin';
import { askHeAccount } from '@/auth/he-accounts';

// The one file that touches Google's sign-in library, `react-native-nitro-google-signin`. The library is native code:
// only a development build or a released app holds it, and loading it anywhere else throws. So nothing here loads it
// until `googleAvailable()` says that this build holds it. On the web `google.web.ts` takes this file's place.

export type GoogleAnswer = { kind: 'token'; idToken: string } | { kind: 'cancelled' };

// How Google is asked for the account: the quick sheet of the accounts on the phone, or Google's own chooser, which
// can also add an account that is not on the phone yet.
export type GoogleAccountPrompt = 'phone-accounts' | 'chooser';

// The main server's client, of type "Web application". Google issues the ID token for it.
function webClientId(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
}

function iosClientId(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
}

// True only in a build that holds the native module and was given the client IDs it needs. Expo Go and Jest hold no
// Nitro module, which the library is built on, so both answer false.
export function googleAvailable(): boolean {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return false;
  }
  if (webClientId() === '' || (Platform.OS === 'ios' && iosClientId() === '')) {
    return false;
  }
  return TurboModuleRegistry.get<TurboModule>('NitroModules') !== null;
}

interface Library {
  GoogleOneTapSignIn: typeof GoogleOneTapSignIn;
}

function isLibrary(loaded: unknown): loaded is Library {
  return typeof loaded === 'object' && loaded !== null && 'GoogleOneTapSignIn' in loaded;
}

// Loads the library and tells it the clients. Telling it again changes nothing, so every call does.
function google(): typeof GoogleOneTapSignIn {
  if (!googleAvailable()) {
    throw new Error('This build holds no Google sign-in');
  }
  // A `require` inside the function, so that the library is loaded here and not when this file is.
  const loaded: unknown = require('react-native-nitro-google-signin');
  if (!isLibrary(loaded)) {
    throw new Error("Google's sign-in library has another shape");
  }
  // No hosted domain is given: it would hide the accounts outside SNU, and the User would not be told why.
  loaded.GoogleOneTapSignIn.configure({
    webClientId: webClientId(),
    iosClientId: iosClientId() === '' ? null : iosClientId(),
  });
  return loaded.GoogleOneTapSignIn;
}

// On the HE branch (P15) no Google sheet opens: either way, the sign-in screen lists the HE accounts, and the one
// picked gives its key in place of the ID token (src/auth/he-accounts.ts). Closing the list is a cancel.
export function askGoogle(_way: GoogleAccountPrompt = 'phone-accounts'): Promise<GoogleAnswer> {
  return askHeAccount();
}

// Signs out of Google on the phone, so that the next sign-in asks which account again.
export async function forgetGoogle(): Promise<void> {
  await google().signOut();
}
