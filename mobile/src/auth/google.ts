import type { TurboModule } from 'react-native';
import { Platform, TurboModuleRegistry } from 'react-native';
import type { GoogleOneTapSignIn } from 'react-native-nitro-google-signin';

// The one file that touches Google's sign-in library, `react-native-nitro-google-signin`. The library is native code:
// only a development build or a released app holds it, and loading it anywhere else throws. So nothing here loads it
// until `googleAvailable()` says that this build holds it. On the web `google.web.ts` takes this file's place.

export type GoogleAnswer = { kind: 'token'; idToken: string } | { kind: 'cancelled' };

// How Google is asked for the account: the quick sheet of the accounts on the phone, or Google's own chooser, which
// can also add an account that is not on the phone yet.
export type GoogleWay = 'phone-accounts' | 'chooser';

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

// Opens Google's account sheet, or its chooser when asked that way, and gives the chosen account's ID token. A User
// who closes either is not a failure. Anything else throws: no Google Play services, a client that Google does not
// know, no network.
export async function askGoogle(way: GoogleWay = 'phone-accounts'): Promise<GoogleAnswer> {
  const signIn = google();
  await signIn.checkPlayServices();
  // `createAccount` is the sheet with every Google account on the phone. A phone with no Google account has nothing
  // to list there, and Google's own dialog, which can add one, opens instead. `presentExplicitSignIn` is that dialog.
  let response = way === 'chooser' ? await signIn.presentExplicitSignIn() : await signIn.createAccount();
  if (response.type === 'noSavedCredentialFound' && way === 'phone-accounts') {
    response = await signIn.presentExplicitSignIn();
  }
  if (response.type === 'cancelled') {
    return { kind: 'cancelled' };
  }
  if (response.type !== 'success' || response.data === null) {
    throw new Error('Google gave no account');
  }
  return { kind: 'token', idToken: response.data.idToken };
}

// Signs out of Google on the phone, so that the next sign-in asks which account again.
export async function forgetGoogle(): Promise<void> {
  await google().signOut();
}
