/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { LibrarySpace } from '@/api/assistant-types';
import { studySpacesQuery } from '@/api/queries';
import type { StudyBuilding } from '@/api/study-types';
import type { Slot } from '@/library/cards/payloads';
import { roomOf } from '@/library/cards/seat-rooms';
import { freeSeatCount } from '@/library/cards/seats';
import { siteBookTime, siteDate } from '@/library/cards/times';
import { library } from '@/library/library';
import { useLibrarySession } from '@/library/library-session';
import type { LibrarySeat } from '@/library/replies';
import { RoomCounting, type Rooms } from './room-counting';

export type { Rooms } from './room-counting';

// A sector's seats for a time, as the library lists them.
export function seatsFor(space: LibrarySpace, slot: Slot): Promise<LibrarySeat[]> {
  return library.seats({
    roomNo: space.roomNo,
    sectorNo: space.sectorNo,
    useTime: slot.minutes,
    bookDate: siteDate(slot.date),
    bookTime: siteBookTime(slot.start, slot.minutes),
  });
}

function sectorsOf(buildings: readonly StudyBuilding[]): LibrarySpace[] {
  return buildings.flatMap(({ liveSeats }) => liveSeats?.sectors ?? []).filter((sector) => roomOf(sector) !== null);
}

// The seat card's counting of its rooms (`RoomCounting`), made once for the card: it holds the counts apart from the
// card, so a count that arrives draws only what reads it (`useRooms`, `useRoomsWith`), and reads the card's time and the
// library session as they are when it is asked.
export function useRoomCounts(slot: Slot): RoomCounting {
  const queryClient = useQueryClient();
  const { loggedIn } = useLibrarySession();
  const now = useRef({ slot, loggedIn });
  useEffect(() => {
    now.current = { slot, loggedIn };
  });
  const [counting] = useState(
    () =>
      new RoomCounting({
        slot: (): Slot => now.current.slot,
        loggedIn: (): boolean => now.current.loggedIn,
        sectors: (): Promise<LibrarySpace[] | null> =>
          queryClient.query({ ...studySpacesQuery, staleTime: 'static' }).then(sectorsOf, () => null),
        count: (sector, at) => seatsFor(sector, at).then(freeSeatCount),
        now: (): number => Date.now(),
      }),
  );
  return counting;
}

// The rooms as the counting has them, drawn again with each change: for the list of rooms.
export function useRooms(counting: RoomCounting): Rooms {
  return useSyncExternalStore(counting.subscribe, counting.get);
}

// One value of the rooms, drawn again only when it changes: for the card, which needs little of them.
export function useRoomsWith<T>(counting: RoomCounting, pick: (rooms: Rooms) => T): T {
  return useSyncExternalStore(counting.subscribe, () => pick(counting.get()));
}
