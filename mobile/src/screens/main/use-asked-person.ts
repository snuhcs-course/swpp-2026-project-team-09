import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { cardId, type CardView } from '@/features/map/adapter';
import type { MainMap } from './use-main-map';
import type { Selection } from './use-selection';

// A member pressed in a Quest's room comes back by the main screen's address, `/main?person=…`: the map goes to the
// member's Avatar, a Friend's or a Party member's, and opens its card, once the cards are known (not null).
export function useAskedPerson(cards: readonly CardView[] | null, map: MainMap, selection: Selection): void {
  const { person } = useLocalSearchParams<{ person?: string }>();
  useEffect(() => {
    if (person === undefined || cards === null) {
      return;
    }
    router.setParams({ person: undefined });
    const card = cards.find(({ id }) => id === cardId.friend(person) || id === cardId.partyMember(person));
    if (card !== undefined) {
      map.goTo(card.position, 'close');
      selection.selectOrWait(card.id);
    }
  }, [person, cards, map, selection]);
}
