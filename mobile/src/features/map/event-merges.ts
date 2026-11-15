/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { CardView } from './adapter';
import { LOOK_MARKS, markedLook, strongestLook } from './event-pins';
import { middleOf, mergedCards, overlapSets } from './overlap';

// The events' pins merged while the whole campus is in view, as the study pins are: a Global Event's own pin and a
// place's pin of events alone that would overlap become one pin, with how many events it holds and the mark of the
// strongest look among them. A press brings them into view, where they stand apart again. A place with things of
// other kinds keeps its own pin.

// An event's own pin, or a place's pin of events alone, that is not within another.
function merges({ kind, mark, within }: CardView): boolean {
  if (within !== undefined) {
    return false;
  }
  return kind === 'global-event' || (kind === 'place-group' && mark.type === 'place' && mark.place === 'official');
}

// How many events a pin holds: a place's, as many as its card lists.
function eventsIn(card: CardView): number {
  return card.kind === 'place-group' ? (card.choices?.length ?? 0) : 1;
}

export function eventClusterId(first: CardView): string {
  return `event-cluster:${first.id}`;
}

function clusterCard(members: readonly CardView[]): CardView {
  const [first] = members;
  if (first === undefined) {
    throw new Error('A cluster has members');
  }
  const count = members.reduce((sum, member) => sum + eventsIn(member), 0);
  const look = strongestLook(members.map(({ mark }) => markedLook(mark))) ?? 'plain';
  return {
    id: eventClusterId(first),
    kind: 'event-cluster',
    mark: { type: 'place', place: 'official', ...LOOK_MARKS[look] },
    marker: { name: `공식 행사 ${count}개 묶음 · 눌러서 확대`, short: `공식 행사 ${count}개`, count, minutesOld: null },
    subLabel: `공식 행사 ${count}개`,
    title: `공식 행사 ${count}개`,
    lines: [],
    primary: null,
    secondary: null,
    position: middleOf(members.map(({ position }) => position)),
    cluster: members.map(({ position }) => position),
  };
}

// Which events' pins would overlap at this zoom: the ids of each set of two or more, in the cards' order. Without a
// zoom, none. As with `studyMerges`, the main screen keys its cards by these sets.
export function eventMerges(cards: readonly CardView[], zoom: number | null): string[][] {
  return overlapSets(cards, zoom, merges);
}

// The cards with each set of `eventMerges` merged, as `clusteredStudy` does.
export function clusteredEvents(cards: readonly CardView[], sets: readonly (readonly string[])[]): readonly CardView[] {
  return mergedCards(cards, sets, clusterCard);
}
