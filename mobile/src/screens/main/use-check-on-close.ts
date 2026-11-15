/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useEffect } from 'react';
import { useCheckEvent } from '@/features/events/checked-events';
import type { CardView } from '@/features/map/adapter';
import { type Selection, useSelection } from './use-selection';

// While a Global Event's card is open on the map, its event is held there. When the card closes, or another card opens
// in its place, the User has checked the event: a New Event's exclamation mark goes, and the event leaves the map
// unless it is a Favorite Event or held today. Opening a place's card, which lists several events, checks none of
// them; the card of one of them, opened from its row, checks it when it closes.
export function useCheckOnClose(selected: CardView | null, hold: (eventId: string | null) => void): void {
  const check = useCheckEvent();
  const eventId = selected?.kind === 'global-event' ? (selected.event?.id ?? null) : null;
  useEffect(() => {
    hold(eventId);
    return (): void => {
      if (eventId !== null) {
        check(eventId);
      }
    };
  }, [eventId, hold, check]);
}

// The main screen's selection (`useSelection`), which checks a Global Event when its card closes.
export function useCheckingSelection(
  cards: readonly CardView[],
  inFront: boolean,
  hold: (eventId: string | null) => void,
): Selection {
  const selection = useSelection(cards, inFront);
  useCheckOnClose(selection.selected, hold);
  return selection;
}
