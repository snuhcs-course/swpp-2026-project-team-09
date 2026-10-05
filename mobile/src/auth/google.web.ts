import type { GoogleAnswer } from './google';

// The web's `google.ts`. The web holds no native module, so this file names Google's library nowhere and the web's
// bundle holds nothing of it. The sign-in module then uses the mock.

export type { GoogleAnswer } from './google';

export function googleAvailable(): boolean {
  return false;
}

export function askGoogle(): Promise<GoogleAnswer> {
  return Promise.reject(new Error('The web holds no Google sign-in'));
}

export function forgetGoogle(): Promise<void> {
  return Promise.reject(new Error('The web holds no Google sign-in'));
}
