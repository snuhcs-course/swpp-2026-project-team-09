/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useRef, useState } from 'react';
import type { LibrarySpace } from '@/api/assistant-types';
import type { Slot } from '@/library/cards/payloads';
import { freeRooms } from '@/library/cards/rooms';
import { useLibrarySession } from '@/library/library-session';
import type { LibraryRoomTimes } from '@/library/replies';
import { RoomCounting } from './room-counting';
import { roomTimesFor } from './room-times';

// The free rooms of each kind of group study room for the answer's time (P10 ticket 10), counted as the seat card's
// rooms are (P01 ticket 08): read when the room chooser opens, each kind's count kept for a minute, a read on its way
// shared. A kind's rooms are told apart from the others of its sector by its own room numbers.

export interface KindCountingDeps {
  // The kinds' library spaces, as the answer gives them (`GroupRoomKind.space`).
  spaces: readonly LibrarySpace[];
  slot: () => Slot;
  loggedIn: () => boolean;
  roomTimes: (space: LibrarySpace, date: string) => Promise<LibraryRoomTimes[]>;
  now: () => number;
}

export function roomKindCounting({ spaces, slot, loggedIn, roomTimes, now }: KindCountingDeps): RoomCounting {
  return new RoomCounting({
    slot,
    loggedIn,
    sectors: () => Promise.resolve([...spaces]),
    count: (space, at) => roomTimes(space, at.date).then((rooms) => freeRooms(rooms, space.seatNos, at).length),
    now,
  });
}

// The counting of the answer's kinds, reading the time and the library session as they are when it is asked.
export function useRoomKindCounts(spaces: readonly LibrarySpace[], slot: Slot): RoomCounting {
  const { loggedIn } = useLibrarySession();
  const now = useRef({ slot, loggedIn });
  useEffect(() => {
    now.current = { slot, loggedIn };
  });
  const [counting] = useState(() =>
    roomKindCounting({
      spaces,
      slot: () => now.current.slot,
      loggedIn: () => now.current.loggedIn,
      roomTimes: roomTimesFor,
      now: () => Date.now(),
    }),
  );
  return counting;
}
