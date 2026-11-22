/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 * 2026-11-23  Fable 5.2  prompted by AhnJinYoung
 ******************************************************************************/

import type { GoogleAnswer } from '@/auth/google';

// The UAT branch's sign-in: where the app would ask Google, the sign-in screen lists the UAT accounts, and the
// account picked gives its key in place of Google's ID token. The main server's copy of the accounts is
// main-server/src/uat/uat-accounts.ts; the two share no code, so they keep the same keys.

export interface UatAccount {
  key: string;
  // The UAT sheet's letter: A1 to A3 are the testers', B and D the helpers', and C and E only hold data.
  role: string;
  name: string;
}

export const UAT_ACCOUNTS: readonly UatAccount[] = [
  { key: 'uat-a1', role: 'A1', name: '김서연' },
  { key: 'uat-a2', role: 'A2', name: '정하윤' },
  { key: 'uat-a3', role: 'A3', name: '최민준' },
  { key: 'uat-b', role: 'B', name: '이도현' },
  { key: 'uat-c', role: 'C', name: '박지호' },
  { key: 'uat-d', role: 'D', name: '한지우' },
  { key: 'uat-e', role: 'E', name: '윤서아' },
];

// The ask that waits for the list's answer, if the list is open, and who watches whether it is.
let waiting: ((answer: GoogleAnswer) => void) | null = null;
const watchers = new Set<() => void>();

function answer(given: GoogleAnswer): void {
  const resolve = waiting;
  waiting = null;
  watchers.forEach((watcher) => {
    watcher();
  });
  resolve?.(given);
}

// Opens the list and waits for a pick, or for the list to close.
export function askUatAccount(): Promise<GoogleAnswer> {
  return new Promise((resolve) => {
    waiting?.({ kind: 'cancelled' });
    waiting = resolve;
    watchers.forEach((watcher) => {
      watcher();
    });
  });
}

export function pickUatAccount(key: string): void {
  answer({ kind: 'token', idToken: key });
}

export function closeUatAccounts(): void {
  if (waiting !== null) {
    answer({ kind: 'cancelled' });
  }
}

export function uatAccountsAsked(): boolean {
  return waiting !== null;
}

export function watchUatAccounts(watcher: () => void): () => void {
  watchers.add(watcher);
  return (): void => {
    watchers.delete(watcher);
  };
}
