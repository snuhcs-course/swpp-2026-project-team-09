/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { LatLng } from '@/api/types';
import type { CardView, PlaceKind } from './adapter';
import { shortTitle } from './short-name';

// The kinds in the order a group draws and lists them, each with its word on a chip and, for a group of that kind
// alone, its word as its own pin says it.
export const PLACE_KINDS: readonly PlaceKind[] = ['official', 'party', 'quest', 'dining', 'shuttle'];

export const KIND_WORDS: Readonly<Record<PlaceKind, { chip: string; alone: string }>> = {
  official: { chip: '행사', alone: '공식 행사' },
  party: { chip: '파티', alone: '파티' },
  quest: { chip: '퀘스트', alone: '퀘스트' },
  dining: { chip: '식당', alone: '식당' },
  shuttle: { chip: '셔틀', alone: '셔틀버스' },
};

// The id of a place on the map where several things are, from its position alone, so that it stays while things
// come to the place and leave it.
export function placeGroupId({ latitude, longitude }: LatLng): string {
  return `place:${latitude},${longitude}`;
}

// A thing grouped at a place, with the kind it is listed and drawn as.
interface Member {
  card: CardView;
  kind: PlaceKind;
}

// A thing that stands still at a place: a person and a shuttle's vehicle move, and are never grouped.
function memberOf(card: CardView): Member | null {
  return card.mark.type === 'place' && card.glideMs === undefined ? { card, kind: card.mark.place } : null;
}

// Where a thing says it is: its line with a pin, or a stop's own name.
function placeWords({ card }: Member): string | null {
  const pin = card.lines.find(({ icon }) => icon === 'pin')?.text;
  return pin ?? (card.kind === 'shuttle-stop' ? card.title : null);
}

// Whose words name a place first: where an event says it is, then a restaurant's Place, a Party's or a Quest's place,
// a stop.
const NAMED_FIRST: readonly PlaceKind[] = ['official', 'dining', 'party', 'quest', 'shuttle'];

// The place's name, from the first of its things that says where it is, or "같은 장소".
function placeName(members: readonly Member[]): string {
  const ordered = NAMED_FIRST.flatMap((kind) => members.filter((member) => member.kind === kind));
  return ordered.map((member) => placeWords(member)).find((words) => words !== null) ?? '같은 장소';
}

// The card of a place where two or more things are. Of one kind, its marker is that kind's pin with their count; of
// several, a circle with a small one for each kind. Its card lists them, each with its first line that is not where.
function groupCard(position: LatLng, members: readonly Member[]): CardView {
  const place = placeName(members);
  const kinds = PLACE_KINDS.filter((kind) => members.some((member) => member.kind === kind));
  // The one kind of a group of one kind, or null.
  const alone = kinds.length === 1 ? (kinds[0] ?? null) : null;
  const subLabel =
    alone === null
      ? kinds
          .map((kind) => `${KIND_WORDS[kind].chip} ${members.filter((one) => one.kind === kind).length}개`)
          .join(' · ')
      : `${KIND_WORDS[alone].alone} ${members.length}개`;
  return {
    id: placeGroupId(position),
    kind: 'place-group',
    mark: alone === null ? { type: 'group', kinds } : { type: 'place', place: alone },
    marker: {
      name: `${subLabel} · ${place}`,
      short: shortTitle(place),
      count: alone === null ? 0 : members.length,
      minutesOld: null,
    },
    subLabel,
    title: place,
    lines: [],
    primary: null,
    secondary: null,
    position,
    choices: members.map(({ card: { id, title, lines }, kind }) => ({
      id,
      kind,
      title,
      detail: lines.find(({ icon }) => icon !== 'pin')?.text ?? '',
    })),
  };
}

// The cards in the same order, with the things at exactly one place grouped: the place's card comes where the first
// thing's would, and each thing's card stays, for a row that selects it, marked as within the place. A thing alone
// at its place, a person and a shuttle's vehicle keep their cards as they are. Things only near each other are apart.
export function groupedByPlace(cards: readonly CardView[]): CardView[] {
  const atPlace = new Map<string, Member[]>();
  for (const card of cards) {
    const member = memberOf(card);
    if (member !== null) {
      const key = placeGroupId(card.position);
      atPlace.set(key, [...(atPlace.get(key) ?? []), member]);
    }
  }
  return cards.flatMap((card): CardView[] => {
    const key = placeGroupId(card.position);
    const together = memberOf(card) === null ? [] : (atPlace.get(key) ?? []);
    if (together.length < 2) {
      return [card];
    }
    const within = { ...card, within: key };
    return together[0]?.card === card ? [groupCard(card.position, together), within] : [within];
  });
}
