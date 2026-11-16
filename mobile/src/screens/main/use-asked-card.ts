/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useRef } from 'react';
import { questInvitationsQuery } from '@/api/queries';
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
// invitations are all cards: one that no card holds has ended, once a read of the list under way and one more read
// after the push (the list may be older than it) hold no card of it either; when the list cannot be read, 파티 opens at
// 초대. A party's card whose room request waited for the booking window also opens its room card in the chat.
export function useAskedCard(
  cards: readonly CardView[] | null,
  map: MainMap,
  selection: Selection,
  chat: ChatSheetControl,
): void {
  const { card } = useLocalSearchParams<{ card?: string }>();
  const showToast = useToast();
  const { fetchStatus, isError, refetch } = useQuery(questInvitationsQuery);
  // The invitation's address for which the list of invitations was read again.
  const readAgain = useRef<string | null>(null);
  const showRoom = useEffectEvent((questId: string): void => {
    void showWaitingRoom(questId, chat);
  });
  useEffect(() => {
    if (card === undefined || cards === null) {
      return;
    }
    const address = readCard(card);
    const shown = cards.find(({ id }) => id === card);
    if (shown === undefined && address?.kind === 'invitation') {
      if (fetchStatus === 'fetching') {
        return;
      }
      if (readAgain.current !== card) {
        readAgain.current = card;
        void refetch();
        return;
      }
    }
    router.setParams({ card: undefined });
    if (address?.kind === 'party') {
      showRoom(address.id);
    }
    if (shown !== undefined) {
      // An invitation's card fits the camera to the invitee's own way itself.
      if (shown.kind !== 'invitation') {
        map.goTo(shown.position, 'close');
      }
      selection.selectOrWait(shown.id);
      return;
    }
    if (address?.kind === 'invitation' && !isError) {
      showToast(INVITATION_GONE);
    } else if (address !== null) {
      router.navigate(fallbackFor(address));
    }
  }, [card, cards, map, selection, showToast, fetchStatus, isError, refetch]);
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
