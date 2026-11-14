/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import type { CardView } from '@/features/map/adapter';
import { fallbackFor, readCard } from '@/push/card-address';
import { useAskedPerson } from './use-asked-person';
import type { MainMap } from './use-main-map';
import type { Selection } from './use-selection';

// A tapped push comes by the main screen's address, `/main?card=<kind>:<id>`, once the cards are known (not null).
// The map goes to the card with that id and opens it; without one, the app opens the screen of the row in 알림.
export function useAskedCard(cards: readonly CardView[] | null, map: MainMap, selection: Selection): void {
  const { card } = useLocalSearchParams<{ card?: string }>();
  useEffect(() => {
    if (card === undefined || cards === null) {
      return;
    }
    router.setParams({ card: undefined });
    const shown = cards.find(({ id }) => id === card);
    if (shown !== undefined) {
      map.goTo(shown.position, 'close');
      selection.selectOrWait(shown.id);
      return;
    }
    const address = readCard(card);
    if (address !== null) {
      router.navigate(fallbackFor(address.kind));
    }
  }, [card, cards, map, selection]);
}

// What the main screen is asked by its address: a member pressed in a Quest's room (`?person=`) and a tapped push's
// card (`?card=`).
export function useAskedByAddress(cards: readonly CardView[] | null, map: MainMap, selection: Selection): void {
  useAskedPerson(cards, map, selection);
  useAskedCard(cards, map, selection);
}
