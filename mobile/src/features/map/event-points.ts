import type { LatLng } from '@/api/types';
import type { CardView } from './adapter';
import { shortTitle } from './short-name';

// A Global Event's card with the words of where the event says it is, or null.
export interface EventCard {
  card: CardView;
  place: string | null;
}

// The id of a point on the map where Global Events are, from its position alone, so that it stays while events come
// to the point and leave it.
export function eventPointId({ latitude, longitude }: LatLng): string {
  return `event-point:${latitude},${longitude}`;
}

// The card of a point where two or more Global Events are: its marker has their count, and its card lists them. The
// point is named as the first event that says where it is.
function eventPointCard(position: LatLng, events: readonly EventCard[]): CardView {
  const place = events.find((event) => event.place !== null)?.place ?? '같은 장소';
  const subLabel = `공식 행사 ${events.length}개`;
  return {
    id: eventPointId(position),
    kind: 'event-point',
    mark: { type: 'place', place: 'official' },
    marker: { name: `${subLabel} · ${place}`, short: shortTitle(place), count: events.length, minutesOld: null },
    subLabel,
    title: place,
    lines: [],
    primary: null,
    secondary: null,
    position,
    choices: events.map(({ card: { id, title, lines } }) => ({ id, title, detail: lines[0]?.text ?? '' })),
  };
}

// The Global Events' cards, in the same order. Events at one point are grouped: the point's card comes where the first
// event's would, and each event's card stays, for a list that selects it, marked as within the point. An event alone
// at its point keeps its card as it is.
export function groupedByPoint(events: readonly EventCard[]): CardView[] {
  const atPoint = new Map<string, EventCard[]>();
  for (const event of events) {
    const key = eventPointId(event.card.position);
    atPoint.set(key, [...(atPoint.get(key) ?? []), event]);
  }
  return events.flatMap((event): CardView[] => {
    const { card } = event;
    const key = eventPointId(card.position);
    const together = atPoint.get(key) ?? [];
    if (together.length < 2) {
      return [card];
    }
    const within = { ...card, within: key };
    return together[0] === event ? [eventPointCard(card.position, together), within] : [within];
  });
}
