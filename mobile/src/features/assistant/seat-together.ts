/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, LibrarySpace } from '@/api/assistant-types';
import type { StudyInput } from '@/api/study-plan-types';
import type { Slot } from '@/library/cards/payloads';
import { clockOf, minutesOf } from '@/library/cards/times';

// "＋ 같이" on the seat answer alone (P10 ticket 15): the study answer together asked for the seat card's day and time,
// and the way back to the seat card the phone kept while that answer is on screen.

// The study input of studying together built from the seat card: its day, its start and end as the window, its length,
// its space as the seat chosen, the asker and then the Friends picked. `what` and `area` are an answer alone's only.
export function seatTogetherInput(slot: Slot, space: LibrarySpace, people: readonly string[]): StudyInput {
  return {
    kind: 'study',
    date: slot.date,
    what: 'any',
    people: people.map((userId) => ({ userId, constraints: [] })),
    together: true,
    window: { from: slot.start, until: clockOf(minutesOf(slot.start) + slot.minutes) },
    area: null,
    minutes: slot.minutes,
    chosen: { seatSpaceId: space.id, roomSpaceId: null },
  };
}

// The seat card kept, with the answer it asked: the conversation as it was before "＋ 같이" asked.
let kept: { answer: AnswerReply; back: () => void } | null = null;

export function keepSeatCard(answer: AnswerReply, back: () => void): void {
  kept = { answer, back };
}

// Every Friend taken out of the study answer together that a seat card asked shows that card again, with no request;
// true when it did. `source` is the conversation's last reply: a time dragged since keeps it.
export function backToSeatCard(source: AnswerReply | null): boolean {
  if (kept === null || source !== kept.answer) {
    return false;
  }
  const { back } = kept;
  kept = null;
  back();
  return true;
}
