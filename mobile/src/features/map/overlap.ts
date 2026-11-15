/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { LatLng } from '@/api/types';
import type { CardView } from './adapter';

// Which pins would overlap on the screen at a zoom, for the study pins and the events' pins that merge while the whole
// campus is in view.

// Two pins nearer than this, in points on the screen, overlap: a pin's head is 34 wide.
export const OVERLAP_POINTS = 36;

// Where a position is drawn at a zoom, in points of the Web Mercator world 256 × 2^zoom wide.
function pointOf({ latitude, longitude }: LatLng, zoom: number): { x: number; y: number } {
  const world = 256 * 2 ** zoom;
  const sin = Math.sin((latitude * Math.PI) / 180);
  return {
    x: ((longitude + 180) / 360) * world,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world,
  };
}

function apart(one: LatLng, other: LatLng, zoom: number): number {
  const a = pointOf(one, zoom);
  const b = pointOf(other, zoom);
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// The ids of each set of two or more of the cards that `merges` that would overlap at this zoom, in the cards' order:
// a card joins the first set whose first card is near it. Without a zoom, none.
export function overlapSets(
  cards: readonly CardView[],
  zoom: number | null,
  merges: (card: CardView) => boolean,
): string[][] {
  if (zoom === null) {
    return [];
  }
  const seeds: CardView[][] = [];
  for (const card of cards) {
    if (merges(card)) {
      const near = seeds.find(
        ([seed]) => seed !== undefined && apart(seed.position, card.position, zoom) < OVERLAP_POINTS,
      );
      if (near === undefined) {
        seeds.push([card]);
      } else {
        near.push(card);
      }
    }
  }
  return seeds.filter((one) => one.length > 1).map((members) => members.map(({ id }) => id));
}

// The middle of the positions, where a merged pin stands.
export function middleOf(positions: readonly LatLng[]): LatLng {
  const count = positions.length;
  return {
    latitude: positions.reduce((sum, { latitude }) => sum + latitude, 0) / count,
    longitude: positions.reduce((sum, { longitude }) => sum + longitude, 0) / count,
  };
}

// The cards with each set of `sets` merged into the card `merged` makes of its members: the merged card comes where its
// first member's would, and each member's card stays, within the merged one, so that it has no marker of its own. With
// no set, the same cards.
export function mergedCards(
  cards: readonly CardView[],
  sets: readonly (readonly string[])[],
  merged: (members: readonly CardView[]) => CardView,
): readonly CardView[] {
  if (sets.length === 0) {
    return cards;
  }
  const setOf = new Map<string, CardView[]>();
  for (const ids of sets) {
    const members = cards.filter(({ id }) => ids.includes(id));
    for (const member of members) {
      setOf.set(member.id, members);
    }
  }
  const made = new Map<CardView, CardView>();
  return cards.flatMap((card): CardView[] => {
    const members = setOf.get(card.id);
    const [first] = members ?? [];
    if (members === undefined || first === undefined) {
      return [card];
    }
    const whole = made.get(first) ?? merged(members);
    made.set(first, whole);
    const within = { ...card, within: whole.id };
    return first === card ? [whole, within] : [within];
  });
}
