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

// What is selected on the main screen's map: the thing whose card is open, the User's own dot, or a Friend whom the
// map does not show.
export interface Selection {
  // The open card, or null. A card that is no longer among the map's cards is closed for good: it does not open
  // again when its thing comes back, such as a Friend who turned their location off and on.
  selected: CardView | null;
  // The User's own card is open, which no thing of the map has: what each Friend sees of the User.
  mine: boolean;
  // The user id of a Friend whose card is open while the map does not show them, or null.
  friend: string | null;
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
  // Opens the card of a Friend whom the map does not show, by their user id, in place of the one that is open. For a
  // row of the friend list.
  selectFriend: (userId: string) => void;
  close: () => void;
  // "어디까지 보이나" stands in the place of the open Friend card, until it is hidden, another selection, or a close.
  seen: boolean;
  showSeen: () => void;
  hideSeen: () => void;
}

// The id that is waited for, and the cards that did not have it.
interface Wait {
  id: string;
  without: readonly CardView[];
}

function has(cards: readonly CardView[], wanted: string): boolean {
  return cards.some(({ id }) => id === wanted);
}

// The selection of a Friend whom the map does not show, which no card of the map has.
const OFF_MAP = 'off-map:';

function offMapFriend(selectedId: string | null): string | null {
  return selectedId?.startsWith(OFF_MAP) === true ? selectedId.slice(OFF_MAP.length) : null;
}

// Android's back button over an open card (`shown` while the map is in front): it hides "어디까지 보이나" first, then
// closes the card. The two are registered in this order, which is also the order they come back in when the map is
// in front again, and the latest takes the press first.
function useBackAndSeen(
  selectedId: string | null,
  shown: boolean,
  close: () => void,
): Pick<Selection, 'seen' | 'showSeen' | 'hideSeen'> {
  useBackToClose(shown, close, { edge: false });
  const [seenOf, setSeenOf] = useState<string | null>(null);
  if (seenOf !== null && seenOf !== selectedId) {
    setSeenOf(null);
  }
  const seen = seenOf !== null && seenOf === selectedId;
  const showSeen = useCallback(() => {
    setSeenOf(selectedId);
  }, [selectedId]);
  const hideSeen = useCallback(() => {
    setSeenOf(null);
  }, []);
  useBackToClose(seen && shown, hideSeen, { edge: false });
  return { seen, showSeen, hideSeen };
}

// One thing at a time is selected. The card's X and Android's back button close it, the button only while the map
// is `inFront`; a press on another thing replaces it. A press on the map beside the things leaves it open, as in the
// frames. `meShown`: the User's own dot is on the map and takes a press; once it does not, the User's own card is
// closed for good, as a thing's that left the map. `offMap`: a Friend whom the map does not show may be selected; such
// a card stays until another selection or a close, also once the map shows them, and is closed for good once `offMap`
// is false.
export function useSelection(cards: readonly CardView[], inFront: boolean, meShown = false, offMap = false): Selection {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wait, setWait] = useState<Wait | null>(null);
  const selected = cards.find(({ id }) => id === selectedId) ?? null;
  const mine = meShown && selectedId === ME_AVATAR_ID;
  const friend = offMap ? offMapFriend(selectedId) : null;
  // The selected thing left the map: the selection is dropped, during this render, so that its return opens nothing.
  if (selectedId !== null && selected === null && !mine && friend === null) {
    setSelectedId(null);
  }
  // The cards changed while an id was waited for: its card opens if it came, and the wait is over either way.
  if (wait !== null && wait.without !== cards) {
    setWait(null);
    if (has(cards, wait.id)) {
      setSelectedId(wait.id);
    }
  }
  const open = selected !== null || mine || friend !== null;
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
  const selectFriend = useCallback((userId: string) => {
    setWait(null);
    setSelectedId(`${OFF_MAP}${userId}`);
  }, []);
  const close = useCallback(() => {
    setSelectedId(null);
    setWait(null);
  }, []);
  const seen = useBackAndSeen(selectedId, open && inFront, close);
  return { selected, mine, friend, open, select, selectOrWait, selectFriend, close, ...seen };
}
