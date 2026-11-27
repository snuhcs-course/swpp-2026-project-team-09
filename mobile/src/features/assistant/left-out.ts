/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LeftOutClass } from '@/api/assistant-types';

// The User's Classes the conversation leaves out ("1시 수업 휴강이야", P01 ticket 40, the main server's P05 ticket 70),
// for every kind of answer: each reply gives the conversation's list back, the app keeps it with that reply's bubble,
// and every message and recalculation of the conversation sends the latest. A ✕ on a time card takes one out.

interface WithLeftOut {
  role: 'user' | 'assistant';
  skipped?: readonly LeftOutClass[];
}

// The conversation's list: the latest reply's that gave one; none before any.
export function leftOutOf(bubbles: readonly WithLeftOut[]): readonly LeftOutClass[] {
  return bubbles.findLast(({ role, skipped }) => role === 'assistant' && skipped !== undefined)?.skipped ?? [];
}

// The bubbles with that Class put back: taken out of the latest list, which the next request sends.
export function withPutBack<Bubble extends WithLeftOut>(bubbles: readonly Bubble[], classId: string): Bubble[] {
  const at = bubbles.findLastIndex(({ role, skipped }) => role === 'assistant' && skipped !== undefined);
  const latest = bubbles[at];
  if (latest?.skipped === undefined) {
    return [...bubbles];
  }
  return bubbles.with(at, { ...latest, skipped: latest.skipped.filter((one) => one.classId !== classId) });
}

// What a request sends of the list: nothing when empty, so that a main server before it sees nothing new.
export function sentLeftOut(list: readonly LeftOutClass[]): { skipped?: LeftOutClass[] } {
  return list.length === 0 ? {} : { skipped: [...list] };
}
