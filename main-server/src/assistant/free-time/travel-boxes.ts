/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type Card, type CardKind } from '../feature.js';
import { type TravelBox } from './party-fit.js';

// What the step after a run needs of each candidate findFreeTimeEvents returned, by card.
export interface JudgedCandidate {
  kind: CardKind;
  id: string;
  title: string;
  // For a Quest, the start of the Sub Quest judged inside the gap, which its card may not show.
  start: Date;
  end: Date | null;
  box: TravelBox;
}

export type JudgedCandidates = Map<string, JudgedCandidate>;

export function cardKey(kind: CardKind, id: string): string {
  return `${kind} ${id}`;
}

// Soonest first, and the same start by title, by code point.
export function bySoonest(
  a: Pick<JudgedCandidate, 'start' | 'title'>,
  b: Pick<JudgedCandidate, 'start' | 'title'>,
): number {
  return a.start.getTime() - b.start.getTime() || (a.title < b.title ? -1 : Number(a.title > b.title));
}

function judgedOf(card: Card, judged: JudgedCandidates): JudgedCandidate | undefined {
  return judged.get(cardKey(card.kind, card.kind === 'quest' ? card.quest.id : card.globalEvent.id));
}

// The cards of a run after what it judged: those of its candidates first, each with its 이동 시간 box and soonest
// first, whatever order the presenters were called in, and the others after them as they were.
export function withTravelBoxes(cards: readonly Card[], judged: JudgedCandidates): Card[] {
  if (judged.size === 0) {
    return [...cards];
  }
  const boxed = cards
    .flatMap((card) => {
      const candidate = judgedOf(card, judged);
      return candidate === undefined ? [] : [{ card: { ...card, ...candidate.box }, candidate }];
    })
    .toSorted((a, b) => bySoonest(a.candidate, b.candidate));
  return [...boxed.map(({ card }) => card), ...cards.filter((card) => judgedOf(card, judged) === undefined)];
}
