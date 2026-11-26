/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useState } from 'react';
import type { RoomRequest } from '@/api/room-requests';
import type { StudyGroup } from '@/api/study-plan-types';
import { now } from '@/clock';
import { withStart } from '@/features/assistant/plan-input';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import type { Slot } from '@/library/cards/payloads';
import { freeRooms } from '@/library/cards/rooms';
import type { LibraryRoomTimes } from '@/library/replies';
import { bookRoom, type RoomWrite } from '../library/book-room-card';
import type { PartyRequest } from '../library/room-party';
import { roomTimesFor } from '../library/room-times';
import { type LibraryCardActions, useLibraryLoad, useWrite } from '../library/use-library-call';
import { againWords, noRoomOf, readyLineOf, roomOnReady, waitWords } from './study-group-booking';

// The room of the study answer together, read from the library, and its booking once everyone has consented (P10
// ticket 14): today's booking (`bookRoom`) with the card's confirmed press, its done message added to the chat as a
// room card's is. The room sent stays while free, else the kind's first free room; with none free the card asks again
// at the next free time, which takes the request back first, since a new time needs new consents.

// The kind's rooms of the time's day, read while logged in; null until read.
function useRoomTimes(group: StudyGroup, slot: Slot, loggedIn: boolean): LibraryRoomTimes[] | null {
  const kind = group.room.space;
  const { loaded } = useLibraryLoad(
    () => (loggedIn ? roomTimesFor(kind, slot.date) : Promise.resolve([])),
    `${kind.id} ${slot.date} ${slot.start} ${String(slot.minutes)} ${String(loggedIn)}`,
  );
  return loaded.state === 'ready' && loggedIn ? loaded.value : null;
}

export interface GroupBookingOf {
  group: StudyGroup;
  slot: Slot;
  loggedIn: boolean;
  shown: ShownAnswer;
  party: PartyRequest;
  out: RoomRequest | null;
  // The room the request was sent with, and the one chosen on the ticket before it.
  sent: string | null;
  chosen: string | null;
  use: string | null;
  library?: LibraryCardActions;
}

export interface GroupBooking {
  free: LibraryRoomTimes[] | null;
  room: string | null;
  // Once everyone has consented: the request's line, in place of the consents.
  line: string | null;
  // In place of the sentence: none free at the time, or the booking window.
  sentence: string | null;
  again: string | null;
  booking: boolean;
  onBook: () => void;
  onAgain: () => void;
}

const ignore = (): void => undefined;

export function useGroupBooking(of: GroupBookingOf): GroupBooking {
  const { group, slot, loggedIn, shown, party, out, library } = of;
  const all = useRoomTimes(group, slot, loggedIn);
  const free = all === null ? null : freeRooms(all, group.room.space.seatNos, slot);
  const ready = out?.status === 'ready';
  const placed = roomOnReady(of.sent, free ?? []);
  const room = ready ? placed.room : (of.chosen ?? free?.[0]?.NAME ?? null);
  const noRoom = ready && free !== null && free.length === 0 ? noRoomOf(group, all ?? [], slot) : null;
  const nextFree = noRoom?.again ?? null;
  const write = useWrite<RoomWrite>((args, press) =>
    bookRoom({ space: group.room.space, notes: [], addOwn: library?.addOwn ?? ignore }, slot, args, press),
  );
  const [againAt, setAgainAt] = useState<string | null>(null);
  const { change, locked } = shown;
  useEffect(() => {
    // Once the request is taken back and the answer let go, the answer is asked again at the next free time.
    if (againAt !== null && out === null && !locked) {
      change((input) => withStart(input, againAt));
      setAgainAt(null);
    }
  }, [againAt, out, locked, change]);
  const times = free?.find(({ NAME }) => NAME === room) ?? null;
  const useDesc = out?.useDesc ?? of.use;
  return {
    free,
    room,
    line: ready ? readyLineOf(loggedIn, placed.switched) : null,
    sentence: noRoom?.words ?? waitWords(group, slot, now()),
    again: nextFree === null ? null : againWords(nextFree, slot.minutes),
    booking: write.busy || (loggedIn && (times === null || useDesc === null)),
    onBook: () => {
      if (times !== null && useDesc !== null && out !== null) {
        write.run({ room: times, useDesc, request: out });
      }
    },
    onAgain: () => {
      if (nextFree !== null) {
        setAgainAt(nextFree);
        party.cancel?.();
      }
    },
  };
}
