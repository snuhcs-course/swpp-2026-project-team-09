/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent } from 'react';
import { useToast } from '@/design-system';
import type { CardView } from '@/features/map/adapter';
import { fallbackFor, readCard } from '@/push/card-address';
import type { ChatSheetControl } from './chat-sheet';
import { showWaitingRoom } from './library/waiting-room';
import { useAskedPerson } from './use-asked-person';
import type { MainMap } from './use-main-map';
import { INVITATION_GONE } from './use-received-invitation';
import type { Selection } from './use-selection';

// A tapped push comes by the main screen's address, `/main?card=<kind>:<id>`, once the cards are known (not null). The
// map goes to the card with that id and opens it; without one, the app opens the screen of the row in 알림. The known
// invitations are all cards: one that no card holds has ended. A party's card whose room request waited for the booking
// window also opens its room card in the chat.
export function useAskedCard(
  cards: readonly CardView[] | null,
  map: MainMap,
  selection: Selection,
  chat: ChatSheetControl,
): void {
  const { card } = useLocalSearchParams<{ card?: string }>();
  const showToast = useToast();
  const showRoom = useEffectEvent((questId: string): void => {
    void showWaitingRoom(questId, chat);
  });
  useEffect(() => {
    if (card === undefined || cards === null) {
      return;
    }
    router.setParams({ card: undefined });
    const address = readCard(card);
    if (address?.kind === 'party') {
      showRoom(address.id);
    }
    const shown = cards.find(({ id }) => id === card);
    if (shown !== undefined) {
      // An invitation's card fits the camera to the invitee's own way itself.
      if (shown.kind !== 'invitation') {
        map.goTo(shown.position, 'close');
      }
      selection.selectOrWait(shown.id);
      return;
    }
    if (address?.kind === 'invitation') {
      showToast(INVITATION_GONE);
    } else if (address !== null) {
      router.navigate(fallbackFor(address));
    }
  }, [card, cards, map, selection, showToast]);
}

// What the main screen is asked by its address: a member pressed in a Quest's room (`?person=`) and a tapped push's
// card (`?card=`).
export function useAskedByAddress(
  cards: readonly CardView[] | null,
  map: MainMap,
  selection: Selection,
  chat: ChatSheetControl,
): void {
  useAskedPerson(cards, map, selection);
  useAskedCard(cards, map, selection, chat);
}
