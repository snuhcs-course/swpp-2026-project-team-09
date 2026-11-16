/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { CardView } from './adapter';
import type { InterestMark, MarkLook } from './interest-marks';
import { middleOf, mergedCards, overlapSets } from './overlap';

// The events' pins merged while the whole campus is in view, as the study pins are: a Global Event's own pin and a
// place's pin of events alone that would overlap become one pin, with how many events it holds and the star when one
// of them is a Favorite Event. A press brings them into view, where they stand apart again. A place with things of
// other kinds keeps its own pin.

// An event's own pin, or a place's pin of events alone, that is not within another.
function mergeable({ kind, mark, within }: CardView): boolean {
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
  const starred = members.some(({ mark }) => mark.type !== 'person' && mark.starred === true);
  return {
    id: eventClusterId(first),
    kind: 'event-cluster',
    mark: { type: 'place', place: 'official', ...(starred ? { starred } : {}) },
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
  return overlapSets(cards, zoom, mergeable);
}

// The cards with each set of `eventMerges` merged, as `clusteredStudy` does.
export function clusteredEvents(cards: readonly CardView[], sets: readonly (readonly string[])[]): readonly CardView[] {
  return mergedCards(cards, sets, clusterCard);
}

type Marks = ReadonlyMap<string, InterestMark>;

// The look of merged events' pins from their interest marks: "!" when one has it, faded when all are, else plain.
function clusterLook(looks: readonly MarkLook[]): MarkLook {
  if (looks.includes('fresh')) {
    return 'fresh';
  }
  return looks.length > 0 && looks.every((look) => look === 'faded') ? 'faded' : 'plain';
}

// The interest marks with one more for each merged pin that holds a marked event, under the pin's own name, so that a
// new match keeps its "!" while the whole campus is in view (the main screen's things).
export function withClusterMarks(cards: readonly CardView[], marks: Marks): Marks {
  const merged = cards.flatMap((card): [string, InterestMark][] => {
    if (card.kind !== 'event-cluster') {
      return [];
    }
    const members = cards.flatMap(({ id, within }) => (within === card.id ? [marks.get(id)] : []));
    const first = members.find((mark) => mark !== undefined);
    if (first === undefined) {
      return [];
    }
    const look = clusterLook(members.map((mark) => mark?.look ?? 'plain'));
    return [[card.id, { ...first, id: card.id, name: card.marker.name, look }]];
  });
  return merged.length === 0 ? marks : new Map([...marks, ...merged]);
}
