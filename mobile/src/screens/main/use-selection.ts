import { useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import type { CardView } from '@/features/map/adapter';

// What is selected on the main screen's map: the thing whose card is open.
export interface Selection {
  // The open card, or null. A card that is no longer among the map's cards is closed for good: it does not open
  // again when its thing comes back, such as a Friend who turned their location off and on.
  selected: CardView | null;
  // Whether a card is open: the parts of the screen that a card hides ask this.
  open: boolean;
  // Selects the thing with this card's id and opens its card, in place of the one that is open. An id that no card
  // has, such as the User's own Avatar's, changes nothing. For a press on the map.
  select: (id: string) => void;
  // The same, for a row of a list, which may be pressed before the map's cards came: an id that no card has is
  // waited for until the cards change, and its card opens then if it is among them. Another selection or a close
  // ends the wait.
  selectOrWait: (id: string) => void;
  close: () => void;
}

// The id that is waited for, and the cards that did not have it.
interface Wait {
  id: string;
  without: readonly CardView[];
}

function has(cards: readonly CardView[], wanted: string): boolean {
  return cards.some(({ id }) => id === wanted);
}

// On Android the back button closes an open card before it leaves the app.
function useBackToClose(open: boolean, close: () => void): void {
  useEffect(() => {
    const back = open
      ? BackHandler.addEventListener('hardwareBackPress', () => {
          close();
          return true;
        })
      : null;
    return (): void => {
      back?.remove();
    };
  }, [open, close]);
}

// One thing at a time is selected. The card's X and Android's back button close it; a press on another thing
// replaces it. A press on the map beside the things leaves it open, as in the frames.
export function useSelection(cards: readonly CardView[]): Selection {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wait, setWait] = useState<Wait | null>(null);
  const selected = cards.find(({ id }) => id === selectedId) ?? null;
  // The selected thing left the map: the selection is dropped, during this render, so that its return opens nothing.
  if (selectedId !== null && selected === null) {
    setSelectedId(null);
  }
  // The cards changed while an id was waited for: its card opens if it came, and the wait is over either way.
  if (wait !== null && wait.without !== cards) {
    setWait(null);
    if (has(cards, wait.id)) {
      setSelectedId(wait.id);
    }
  }
  const open = selected !== null;
  const selectOrWait = useCallback(
    (id: string) => {
      const known = has(cards, id);
      setWait(known ? null : { id, without: cards });
      if (known) {
        setSelectedId(id);
      }
    },
    [cards],
  );
  const select = useCallback(
    (id: string) => {
      if (has(cards, id)) {
        selectOrWait(id);
      }
    },
    [cards, selectOrWait],
  );
  const close = useCallback(() => {
    setSelectedId(null);
    setWait(null);
  }, []);
  useBackToClose(open, close);
  return { selected, open, select, selectOrWait, close };
}
