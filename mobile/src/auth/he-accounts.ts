/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { GoogleAnswer } from '@/auth/google';

// The HE branch's sign-in (P15): where the app would ask Google, the sign-in screen lists the seven HE accounts, and
// the account picked gives its key in place of Google's ID token. The main server's copy of the accounts is
// main-server/src/he/he-accounts.ts; the two share no code, so they keep the same keys.

export interface HeAccount {
  key: string;
  // 1라운드, 2라운드 or 예비.
  role: string;
  name: string;
}

// In the order of the spec's table.
export const HE_ACCOUNTS: readonly HeAccount[] = [
  { key: 'he-r1a', role: '1라운드', name: '김하늘' },
  { key: 'he-r1b', role: '1라운드', name: '최유나' },
  { key: 'he-r2a', role: '2라운드', name: '한지우' },
  { key: 'he-r2b', role: '2라운드', name: '정민재' },
  { key: 'he-s1', role: '예비', name: '이도현' },
  { key: 'he-s2', role: '예비', name: '박서진' },
  { key: 'he-s3', role: '예비', name: '오세린' },
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
export function askHeAccount(): Promise<GoogleAnswer> {
  return new Promise((resolve) => {
    waiting?.({ kind: 'cancelled' });
    waiting = resolve;
    watchers.forEach((watcher) => {
      watcher();
    });
  });
}

export function pickHeAccount(key: string): void {
  answer({ kind: 'token', idToken: key });
}

export function closeHeAccounts(): void {
  if (waiting !== null) {
    answer({ kind: 'cancelled' });
  }
}

export function heAccountsAsked(): boolean {
  return waiting !== null;
}

export function watchHeAccounts(watcher: () => void): () => void {
  watchers.add(watcher);
  return (): void => {
    watchers.delete(watcher);
  };
}
