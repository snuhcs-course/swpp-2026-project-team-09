/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';

// The Plan a menu question's answer opens at, its Restaurant's (P04 ticket 72), whose menu the raised card shows; -1
// for any other answer, and for an `opened` that names none of its Plans.
export function openedIndex(source: AnswerReply | null): number {
  const opened = source?.opened;
  return opened === undefined ? -1 : (source?.plans.findIndex(({ id }) => id === opened) ?? -1);
}
