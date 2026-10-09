// AI-generated with Claude Opus 5.5, 2026-10-05 to 2026-10-09, prompted by AhnJinYoung and Jaehyun0320, reviewed by fyoon46 in #74
import type { GoogleAnswer } from './google';

// The web's `google.ts`. The web holds no native module, so this file names Google's library nowhere and the web's
// bundle holds nothing of it. The sign-in module then uses the mock.

export type { GoogleAnswer, GoogleAccountPrompt } from './google';

export function googleAvailable(): boolean {
  return false;
}

export function askGoogle(): Promise<GoogleAnswer> {
  return Promise.reject(new Error('The web holds no Google sign-in'));
}

export function forgetGoogle(): Promise<void> {
  return Promise.reject(new Error('The web holds no Google sign-in'));
}
