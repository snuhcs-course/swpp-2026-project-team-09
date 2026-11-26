/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLabel, AnswerSymbol } from '@/design-system';
import type { AnswerThing } from './answer-drawing';
import type { Draft } from './answer-groups';

// The things an answer's placed marks are drawn as (`answer-marks.ts`).

export interface Placed {
  draft: Draft;
  symbol: AnswerSymbol | null;
  label: AnswerLabel | null;
  // A meal candidate whose round is drawn: its label is its minutes' capsule (P04 ticket 83).
  capsule: boolean;
}

const MINUTES = ':minutes';

// A mark's things: its symbol and its label as one picture; a meal candidate's numbered round and its minutes as two
// (P04 ticket 83), the round the one made ahead and the minutes named by their words alone, so that no picture is
// made for a number and minutes together.
function thingsOf({ draft, symbol, label, capsule }: Placed): Omit<AnswerThing, 'order'>[] {
  const { id, name, position, planId, roundName = name } = draft;
  const thing = {
    id,
    name,
    position,
    look: { kind: 'answer', symbol, label: capsule ? null : label },
    planId,
  } as const;
  if (!capsule || label === null) {
    return [thing];
  }
  return [
    { ...thing, name: roundName },
    { ...thing, id: `${id}${MINUTES}`, look: { kind: 'answer', symbol: null, label } },
  ];
}

// Every mark's things in their drawing order, the first on top; the minutes' capsules under every round, so that a
// round stands at its capsule's end and no capsule covers another candidate's number.
export function thingsInOrder(placed: readonly Placed[]): AnswerThing[] {
  const all = placed.flatMap((one) => thingsOf(one));
  const ordered = [...all.filter(({ id }) => !id.endsWith(MINUTES)), ...all.filter(({ id }) => id.endsWith(MINUTES))];
  return ordered.map((thing, index) => Object.assign(thing, { order: ordered.length - index }));
}
