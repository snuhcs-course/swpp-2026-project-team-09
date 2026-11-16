/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ListedGlobalEvent } from '@/api/types';

// How a Global Event's pin looks: `favorite` with the star, for a Favorite Event; `plain`, any other.
export type EventLook = 'favorite' | 'plain';

export interface EventPin {
  event: ListedGlobalEvent;
  look: EventLook;
}

// Which of the published events stand on the everyday map, in their order, each with its look. The map keeps a
// Favorite Event until it ends, which the list it comes from decides, and puts no other event on it: the others are in
// the 행사 tab and are found by asking the Assistant (`.scratch/iteration-4/agentic-map-design.md`, Watching
// interests). While the interest marks choose the events (`forInterestMarks`, the switch of the answer on the map on),
// every event is passed on and the marks keep those that match a watched interest (`interest-marks.ts`). The one rule
// of the event pins: the matches join it here once the marks are the default.
export function eventPins(events: readonly ListedGlobalEvent[], forInterestMarks = false): EventPin[] {
  return events.flatMap((event): EventPin[] => {
    if (event.favorite) {
      return [{ event, look: 'favorite' }];
    }
    return forInterestMarks ? [{ event, look: 'plain' }] : [];
  });
}
