/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ListedGlobalEvent } from '@/api/types';
import { sameKoreaDay } from '@/korea-time';

// How a Global Event's pin looks: `favorite` with the star, for a Favorite Event; `plain`, today's pin.
export type EventLook = 'favorite' | 'plain';

export interface EventPin {
  event: ListedGlobalEvent;
  look: EventLook;
}

// Whether the event is held today in Korea: on the day of its start or of its end. An event of several days is so
// only on its first and last day, so that it does not stand on the map all week.
function heldToday({ startsAt, endsAt }: ListedGlobalEvent, now: Date): boolean {
  return sameKoreaDay(new Date(startsAt), now) || (endsAt !== null && sameKoreaDay(new Date(endsAt), now));
}

// Which of the published events stand on the map at `now`, in their order, each with its look: a Favorite Event until
// it ends, which the list it comes from decides, and otherwise an event held today. Any other stays off the map and
// in the 행사 tab. Where both hold, the star wins.
export function eventPins(events: readonly ListedGlobalEvent[], now: Date): EventPin[] {
  return events.flatMap((event): EventPin[] => {
    if (event.favorite) {
      return [{ event, look: 'favorite' }];
    }
    return heldToday(event, now) ? [{ event, look: 'plain' }] : [];
  });
}
