/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LibraryErrorKind } from './call-script';
import type { LibraryEndpoint } from './site';

// What one library call took, to learn the real phone's times (P01 ticket 08): the endpoint's name, how it ended, the
// reply's size, and the times. Nothing of what was asked or answered.
export interface CallTiming {
  endpoint: LibraryEndpoint;
  outcome: 'ok' | LibraryErrorKind;
  // The reply's length in characters as it crossed the web view's bridge; 0 without one.
  size: number;
  // The wait for the hidden view's page, then the call itself.
  pageMs: number;
  callMs: number;
}

export type NoteCall = (timing: CallTiming) => void;

// Printed by a development build only, the phone-preview build among them, whose Metro shows it. A released app prints
// nothing, and nothing is sent anywhere.
export function printCall({ endpoint, outcome, size, pageMs, callMs }: CallTiming): void {
  if (__DEV__ && process.env.NODE_ENV !== 'test') {
    console.log(
      `[library] ${endpoint} ${outcome} · ${String(size)} chars · page ${String(pageMs)} ms · call ${String(callMs)} ms`,
    );
  }
}
