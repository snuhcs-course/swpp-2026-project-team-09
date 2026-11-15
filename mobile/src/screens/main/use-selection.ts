/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useState } from 'react';
import type { CardView } from '@/features/map/adapter';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { ME_AVATAR_ID } from './use-me';

// What is selected on the main screen's map: the thing whose card is open, or the User's own dot.
export interface Selection {
  // The open card, or null. A card that is no longer among the map's cards is closed for good: it does not open
  // again when its thing comes back, such as a Friend who turned their location off and on.
  selected: CardView | null;
  // The User's own card is open, which no thing of the map has: what each Friend sees of the User.
  mine: boolean;
  // Whether a card is open: the parts of the screen that a card hides ask this.
  open: boolean;
  // Selects the thing with this card's id and opens its card, in place of the one that is open. The User's own
  // Avatar's id opens the User's own card while the dot takes a press; any other id that no card has changes nothing.
  // For a press on the map.
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

// One thing at a time is selected. The card's X and Android's back button close it, the button only while the map
// is `inFront`; a press on another thing replaces it. A press on the map beside the things leaves it open, as in the
// frames. `meShown`: the User's own dot is on the map and takes a press; once it does not, the User's own card is
// closed for good, as a thing's that left the map.
export function useSelection(cards: readonly CardView[], inFront: boolean, meShown = false): Selection {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wait, setWait] = useState<Wait | null>(null);
  const selected = cards.find(({ id }) => id === selectedId) ?? null;
  const mine = meShown && selectedId === ME_AVATAR_ID;
  // The selected thing left the map: the selection is dropped, during this render, so that its return opens nothing.
  if (selectedId !== null && selected === null && !mine) {
    setSelectedId(null);
  }
  // The cards changed while an id was waited for: its card opens if it came, and the wait is over either way.
  if (wait !== null && wait.without !== cards) {
    setWait(null);
    if (has(cards, wait.id)) {
      setSelectedId(wait.id);
    }
  }
  const open = selected !== null || mine;
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
      } else if (id === ME_AVATAR_ID && meShown) {
        setWait(null);
        setSelectedId(id);
      }
    },
    [cards, selectOrWait, meShown],
  );
  const close = useCallback(() => {
    setSelectedId(null);
    setWait(null);
  }, []);
  useBackToClose(open && inFront, close, { edge: false });
  return { selected, mine, open, select, selectOrWait, close };
}
