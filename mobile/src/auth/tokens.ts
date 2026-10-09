// AI-generated with Claude Opus 5.5, 2026-10-08, prompted by Jaehyun0320
import * as SecureStore from 'expo-secure-store';

// The main server's tokens, kept in the phone's secure storage: the Keychain on iOS and the Keystore on Android. The
// access token goes with every request and with the socket connection; the refresh token renews both.

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_KEY = 'snunow.access-token';
const REFRESH_KEY = 'snunow.refresh-token';

// The tokens as the app holds them while it runs, so that a request does not read the storage each time. Undefined
// until `loadTokens()` has read the storage.
let held: Tokens | null | undefined;

// Reads the storage once, when the app starts. A storage that cannot be read holds nothing.
export async function loadTokens(): Promise<Tokens | null> {
  if (held !== undefined) {
    return held;
  }
  try {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    held = accessToken === null || refreshToken === null ? null : { accessToken, refreshToken };
  } catch {
    held = null;
  }
  return held;
}

export function heldTokens(): Tokens | null {
  return held ?? null;
}

export async function keepTokens(tokens: Tokens): Promise<void> {
  held = tokens;
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
  ]);
}

// After a sign-out or the end of the Session. Tokens that could not be deleted from the storage are still forgotten
// by the app: the main server refuses them anyway.
export async function forgetTokens(): Promise<void> {
  held = null;
  try {
    await Promise.all([SecureStore.deleteItemAsync(ACCESS_KEY), SecureStore.deleteItemAsync(REFRESH_KEY)]);
  } catch {
    // Nothing to do.
  }
}

// For the tests: the next `loadTokens()` reads the storage again, as a new start of the app does.
export function dropHeldTokens(): void {
  held = undefined;
}
