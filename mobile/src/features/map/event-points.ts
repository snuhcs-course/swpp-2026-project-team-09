import type { LatLng } from '@/api/types';
import type { CardView } from './adapter';
import { shortTitle } from './short-name';

// The id of the place where Global Events are, from its position alone, so that it stays while events come to the
// place and leave it.
export function eventPlaceId({ latitude, longitude }: LatLng): string {
  return `event-place:${latitude},${longitude}`;
}

// The card of a place where two or more Global Events are: its marker has their count, and its card lists them. The
// place is named as the first event that names one.
function eventPlaceCard(events: readonly CardView[], places: readonly (string | null)[]): CardView {
  const [first] = events;
  const position = first?.position ?? { latitude: 0, longitude: 0 };
  const place = places.find((name) => name !== null) ?? '같은 장소';
  const subLabel = `공식 행사 ${events.length}개`;
  return {
    id: eventPlaceId(position),
    kind: 'event-place',
    mark: { type: 'place', place: 'official' },
    marker: { name: `${subLabel} · ${place}`, short: shortTitle(place), count: events.length, minutesOld: null },
    subLabel,
    title: place,
    lines: [],
    primary: null,
    secondary: null,
    position,
    choices: events.map(({ id, title, lines }) => ({ id, title, detail: lines[0]?.text ?? '' })),
  };
}

// The Global Events' cards, with each event's place as the event names it, in the same order. Events at one position
// are one place: its card comes where the first event's would, and each event's card stays, for a list that selects
// it, marked as within the place. An event alone at its position keeps its card as it is.
export function atPlaces(cards: readonly CardView[], places: readonly (string | null)[]): CardView[] {
  const atPosition = new Map<string, number[]>();
  for (const [index, card] of cards.entries()) {
    const key = eventPlaceId(card.position);
    atPosition.set(key, [...(atPosition.get(key) ?? []), index]);
  }
  return cards.flatMap((card, index): CardView[] => {
    const key = eventPlaceId(card.position);
    const together = atPosition.get(key) ?? [];
    if (together.length < 2) {
      return [card];
    }
    const within = { ...card, within: key };
    if (together[0] !== index) {
      return [within];
    }
    const events = together.flatMap((at) => cards[at] ?? []);
    return [
      eventPlaceCard(
        events,
        together.map((at) => places[at] ?? null),
      ),
      within,
    ];
  });
}
