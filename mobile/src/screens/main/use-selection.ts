/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useState } from 'react';
import type { Place } from '@/api/types';
import type { CardView } from '@/features/map/adapter';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { ME_AVATAR_ID } from './use-me';

// What is selected on the main screen's map: the thing whose card is open, the User's own dot, a pressed building, or
// a Friend whom the map does not show.
export interface Selection {
  // The open card, or null. A card that is no longer among the map's cards is closed for good: it does not open
  // again when its thing comes back, such as a Friend who turned their location off and on.
  selected: CardView | null;
  // The User's own card is open, which no thing of the map has: what each Friend sees of the User.
  mine: boolean;
  // The Place of a building pressed on the map, whose card is open, or null.
  place: Place | null;
  // Opens the card of a pressed building's Place, in place of the one that is open, while buildings take a press.
  selectPlace: (place: Place) => void;
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
  // row of a list of Friends.
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
// The selection of a pressed building, which no card of the map has either.
const PLACE = 'place:';

// The Friends whose card may be open while the map does not show them, by user id.
export type OffMapFriends = readonly string[];

// The Friend of a selection made by `selectFriend`, while their card may be open; null otherwise.
function offMapFriend(selectedId: string | null, offMap: OffMapFriends): string | null {
  const userId = selectedId?.startsWith(OFF_MAP) === true ? selectedId.slice(OFF_MAP.length) : null;
  return userId !== null && offMap.includes(userId) ? userId : null;
}

// The Place of the pressed building that is selected; null otherwise.
function placeOf(pressed: Place | null, selectedId: string | null): Place | null {
  return pressed !== null && selectedId === `${PLACE}${pressed.id}` ? pressed : null;
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

// The ways to select, each in place of what is selected. `only` selects an id at once and ends a wait.
function useSelects(
  cards: readonly CardView[],
  meShown: boolean,
  only: (id: string) => void,
  setWait: (wait: Wait) => void,
  setPressed: (place: Place) => void,
): Pick<Selection, 'select' | 'selectOrWait' | 'selectFriend' | 'selectPlace'> {
  const selectOrWait = useCallback(
    (id: string) => {
      if (has(cards, id)) {
        only(id);
      } else {
        setWait({ id, without: cards });
      }
    },
    [cards, only, setWait],
  );
  const select = useCallback(
    (id: string) => {
      if (has(cards, id) || (id === ME_AVATAR_ID && meShown)) {
        only(id);
      }
    },
    [cards, meShown, only],
  );
  const selectFriend = useCallback(
    (userId: string) => {
      only(`${OFF_MAP}${userId}`);
    },
    [only],
  );
  const selectPlace = useCallback(
    (chosen: Place) => {
      setPressed(chosen);
      only(`${PLACE}${chosen.id}`);
    },
    [only, setPressed],
  );
  return { select, selectOrWait, selectFriend, selectPlace };
}

// One thing at a time is selected. The card's X and Android's back button close it, the button only while the map
// is `inFront`; a press on another thing replaces it, and a press on the same thing brings its card back from
// "어디까지 보이나". A press on the map beside the things leaves it open, as in the frames. `meShown`: the User's own
// dot is on the map and takes a press; once it does not, the User's own card is closed for good, as a thing's that
// left the map. `offMap`: the Friends whom a card may be open for without their mark on the map; such a card stays
// until another selection or a close, also once the map shows them, and is closed for good once its Friend is not
// among `offMap`.
export function useSelection(
  cards: readonly CardView[],
  inFront: boolean,
  meShown = false,
  offMap: OffMapFriends = [],
): Selection {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wait, setWait] = useState<Wait | null>(null);
  const selected = cards.find(({ id }) => id === selectedId) ?? null;
  const mine = meShown && selectedId === ME_AVATAR_ID;
  const [pressed, setPressed] = useState<Place | null>(null);
  const place = placeOf(pressed, selectedId);
  const friend = offMapFriend(selectedId, offMap);
  // The selected thing left the map, or its Friend's card may no longer be open: the selection is dropped, during this
  // render, so that its return opens nothing.
  if (selectedId !== null && selected === null && !mine && friend === null && place === null) {
    setSelectedId(null);
  }
  // The cards changed while an id was waited for: its card opens if it came, and the wait is over either way.
  if (wait !== null && wait.without !== cards) {
    setWait(null);
    if (has(cards, wait.id)) {
      setSelectedId(wait.id);
    }
  }
  const open = selected !== null || mine || friend !== null || place !== null;
  const close = useCallback(() => {
    setSelectedId(null);
    setWait(null);
  }, []);
  const { seen, showSeen, hideSeen } = useBackAndSeen(selectedId, open && inFront, close);
  const only = useCallback(
    (id: string) => {
      hideSeen();
      setWait(null);
      setSelectedId(id);
    },
    [hideSeen],
  );
  const selects = useSelects(cards, meShown, only, setWait, setPressed);
  return { selected, mine, place, friend, open, ...selects, close, seen, showSeen, hideSeen };
}
