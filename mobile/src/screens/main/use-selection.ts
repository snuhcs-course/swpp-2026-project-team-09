import { useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import type { CardView } from '@/features/map/adapter';

// What is selected on the main screen's map: the thing whose card is open.
export interface Selection {
  // The open card, or null. A card that is no longer among the map's cards is closed.
  selected: CardView | null;
  // Whether a card is open: the parts of the screen that a card hides ask this.
  open: boolean;
  // Selects the thing with this card's id and opens its card, in place of the one that is open. An id that no card
  // has, such as the User's own Avatar's, changes nothing. For a press on the map and for a row of a list.
  select: (id: string) => void;
  close: () => void;
}

// One thing at a time is selected. The card's X and Android's back button close it; a press on another thing
// replaces it. A press on the map beside the things leaves it open, as in the frames.
export function useSelection(cards: readonly CardView[]): Selection {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = cards.find(({ id }) => id === selectedId) ?? null;
  const open = selected !== null;
  const select = useCallback(
    (id: string) => {
      if (cards.some((card) => card.id === id)) {
        setSelectedId(id);
      }
    },
    [cards],
  );
  const close = useCallback(() => {
    setSelectedId(null);
  }, []);
  // On Android the back button closes an open card before it leaves the app.
  useEffect(() => {
    const back = open
      ? BackHandler.addEventListener('hardwareBackPress', () => {
          setSelectedId(null);
          return true;
        })
      : null;
    return (): void => {
      back?.remove();
    };
  }, [open]);
  return { selected, open, select, close };
}
