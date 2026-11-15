/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ListedGlobalEvent } from '@/api/types';
import { sameKoreaDay } from '@/korea-time';
import type { CardMark } from './adapter';

// How a Global Event's pin looks: `new` with the exclamation mark, for a New Event; `favorite` with the star, for a
// Favorite Event; `plain`, today's pin.
export type EventLook = 'new' | 'favorite' | 'plain';

// The looks from the strongest: a pin of several events takes the first any of them has.
const STRONGEST_FIRST: readonly EventLook[] = ['new', 'favorite', 'plain'];

// An event published less than this long ago is a New Event until the User checks it.
export const NEW_FOR_MS = 24 * 60 * 60 * 1000;

export interface EventPin {
  event: ListedGlobalEvent;
  look: EventLook;
}

// What the User has done with the events on this phone: the ids of the New Events they checked, by closing the event's
// card on the map or starring it, and the event whose card is open on the map, if any.
export interface EventChecks {
  checked: ReadonlySet<string>;
  open: string | null;
}

const NONE: EventChecks = { checked: new Set(), open: null };

// The marks of the looks on a card: a New Event's exclamation mark, a Favorite Event's star. A pin of several events
// has the mark of the strongest look among them.
export const LOOK_MARKS = { new: { fresh: true }, favorite: { starred: true }, plain: {} } as const;

// The look a card's mark shows.
export function markedLook(mark: CardMark): EventLook {
  if (mark.type === 'person') {
    return 'plain';
  }
  if (mark.fresh === true) {
    return 'new';
  }
  return mark.starred === true ? 'favorite' : 'plain';
}

// The strongest of the looks, or null for none.
export function strongestLook(looks: Iterable<EventLook>): EventLook | null {
  const had = new Set(looks);
  return STRONGEST_FIRST.find((look) => had.has(look)) ?? null;
}

// Whether the event was published less than 24 hours before `now`. One published before the main server recorded it
// never was.
export function publishedLately({ publishedAt }: ListedGlobalEvent, now: Date): boolean {
  return publishedAt !== null && now.getTime() - new Date(publishedAt).getTime() < NEW_FOR_MS;
}

// Whether the event is held today in Korea: on the day of its start or of its end. An event of several days is so
// only on its first and last day, so that it does not stand on the map all week.
function heldToday({ startsAt, endsAt }: ListedGlobalEvent, now: Date): boolean {
  return sameKoreaDay(new Date(startsAt), now) || (endsAt !== null && sameKoreaDay(new Date(endsAt), now));
}

function lookOf(event: ListedGlobalEvent, now: Date, { checked, open }: EventChecks): EventLook | null {
  if (publishedLately(event, now) && !checked.has(event.id)) {
    return 'new';
  }
  if (event.favorite) {
    return 'favorite';
  }
  // The event whose card is open stays until the card closes, though the User checked it meanwhile.
  return heldToday(event, now) || event.id === open ? 'plain' : null;
}

// Which of the published events stand on the map at `now`, in their order, each with its look: a New Event until the
// User checks it, a Favorite Event until it ends, which the list it comes from decides, and otherwise an event held
// today. Any other stays off the map and in the 행사 tab. Where several hold, the strongest look wins.
export function eventPins(events: readonly ListedGlobalEvent[], now: Date, checks: EventChecks = NONE): EventPin[] {
  return events.flatMap((event): EventPin[] => {
    const look = lookOf(event, now, checks);
    return look === null ? [] : [{ event, look }];
  });
}
