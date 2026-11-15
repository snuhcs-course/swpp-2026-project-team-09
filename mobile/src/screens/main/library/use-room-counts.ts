/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import type { LibrarySpace } from '@/api/assistant-types';
import { studySpacesQuery } from '@/api/queries';
import type { StudyBuilding } from '@/api/study-types';
import type { Slot } from '@/library/cards/payloads';
import { type RoomCount, type RoomCounts, roomOf } from '@/library/cards/seat-rooms';
import { freeSeats } from '@/library/cards/seats';
import { siteBookTime, siteDate } from '@/library/cards/times';
import { library } from '@/library/library';
import { useLibrarySession } from '@/library/library-session';
import type { LibrarySeat } from '@/library/replies';

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

// The seat card's rooms: the seat sectors the 공부공간 layer gives for 관정관, already cut by 소속 on the server, and
// their free seats for the card's time. Nothing is read before `read`.
export type Rooms =
  | { state: 'idle' | 'listing' | 'unlisted' }
  | { state: 'listed'; sectors: readonly LibrarySpace[]; counts: RoomCounts };

function sectorsOf(buildings: readonly StudyBuilding[]): LibrarySpace[] {
  return buildings.flatMap(({ liveSeats }) => liveSeats?.sectors ?? []).filter((sector) => roomOf(sector) !== null);
}

function countOf(result: PromiseSettledResult<LibrarySeat[]> | undefined): RoomCount {
  return result?.status === 'fulfilled' ? freeSeats(result.value).length : 'failed';
}

// `read` lists the sectors and reads each one's seats for the slot at once; a read that fails leaves the others.
// Without a library session it lists the sectors and reads nothing. The newest read wins.
export function useRoomCounts(slot: Slot): { rooms: Rooms; read: () => Promise<Rooms> } {
  const queryClient = useQueryClient();
  const { loggedIn } = useLibrarySession();
  const [rooms, setRooms] = useState<Rooms>({ state: 'idle' });
  const round = useRef(0);
  const read = useCallback(async (): Promise<Rooms> => {
    round.current += 1;
    const mine = round.current;
    const settle = (next: Rooms): Rooms => {
      if (mine === round.current) {
        setRooms(next);
      }
      return next;
    };
    setRooms((last) => (last.state === 'listed' ? last : { state: 'listing' }));
    const sectors = await queryClient.query({ ...studySpacesQuery, staleTime: 'static' }).then(sectorsOf, () => null);
    if (sectors === null) {
      return settle({ state: 'unlisted' });
    }
    if (!loggedIn) {
      return settle({ state: 'listed', sectors, counts: null });
    }
    settle({ state: 'listed', sectors, counts: new Map(sectors.map(({ id }) => [id, 'pending'])) });
    const results = await Promise.allSettled(sectors.map((sector) => seatsFor(sector, slot)));
    const counts = new Map(sectors.map(({ id }, index): [string, RoomCount] => [id, countOf(results[index])]));
    return settle({ state: 'listed', sectors, counts });
  }, [queryClient, loggedIn, slot]);
  return { rooms, read };
}
