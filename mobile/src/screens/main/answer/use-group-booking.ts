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
import { bookedHere } from '@/library/room-bookings';
import { bookRoom, type RoomWrite } from '../library/book-room-card';
import type { PartyRequest } from '../library/room-party';
import { roomTimesFor } from '../library/room-times';
import {
  type CardFailure,
  type LibraryCardActions,
  useLibraryLoad,
  useWrite,
  type Write,
} from '../library/use-library-call';
import { againWords, noRoomOf, readyLineOf, roomOnReady, waitWords } from './study-group-booking';
import { isBooked } from './study-group-request';

// The room of the study answer together, read from the library, and its booking once everyone has consented (P10
// ticket 14): today's booking (`bookRoom`) with the card's confirmed press, its done message added to the chat as a
// room card's is. The room sent stays while free, else the kind's first free room; with none free the card asks again
// at the next free time, which takes the request back first, since a new time needs new consents.

// The kind's rooms of the time's day, read while logged in; null until read.
function useRoomTimes(
  group: StudyGroup,
  slot: Slot,
  loggedIn: boolean,
): { all: LibraryRoomTimes[] | null; reload: () => void } {
  const kind = group.room.space;
  const { loaded, reload } = useLibraryLoad(
    () => (loggedIn ? roomTimesFor(kind, slot.date) : Promise.resolve([])),
    `${kind.id} ${slot.date} ${slot.start} ${String(slot.minutes)} ${String(loggedIn)}`,
  );
  return { all: loaded.state === 'ready' && loggedIn ? loaded.value : null, reload };
}

// The request booked from this phone: at once on the booking, and on showing again from what the phone keeps, since
// the server may still say ready (#657's review).
function useBooked(out: RoomRequest | null): { booked: boolean; markBooked: () => void } {
  const [booked, setBooked] = useState<string | null>(null);
  const id = out?.id ?? null;
  useEffect(() => {
    let current = true;
    if (id !== null) {
      void bookedHere(id).then((here) => {
        if (here && current) {
          setBooked(id);
        }
      });
    }
    return (): void => {
      current = false;
    };
  }, [id]);
  return {
    booked: id !== null && booked === id,
    markBooked: () => {
      setBooked(id);
    },
  };
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
  // Booked from this phone, though the server may still say ready: 예약하기 is not offered again.
  booked: boolean;
  // What the booking came to when it failed, as a room card says it, and its login that books again.
  failure: CardFailure | null;
  logIn: () => void;
  onBook: () => void;
  // "로그인하고 예약": once logged in, the booking waits for the kind's rooms, read again.
  onLoggedIn: () => void;
  onAgain: () => void;
}

const ignore = (): void => undefined;

// The booking, which reads the rooms again after any failure, since the room may have been taken meanwhile; and the
// one asked for before a login, made once the rooms are read.
function useBooking(
  of: GroupBookingOf,
  room: RoomWrite | null,
  reload: () => void,
): {
  write: Write<RoomWrite>;
  booked: boolean;
  // The room this phone booked, which the ticket keeps whatever the rooms read since say.
  bookedRoom: string | null;
  onLoggedIn: () => void;
} {
  const { group, slot, library, out } = of;
  const { booked, markBooked } = useBooked(out);
  const [bookedRoom, setBookedRoom] = useState<string | null>(null);
  const write = useWrite<RoomWrite>(async (args, press) => {
    const space = group.room.space;
    const failed = await bookRoom({ space, notes: [], addOwn: library?.addOwn ?? ignore }, slot, args, press);
    if (failed === null) {
      setBookedRoom(args.room.NAME);
      markBooked();
    } else {
      reload();
    }
    return failed;
  }, reload);
  const [afterLogIn, setAfterLogIn] = useState(false);
  useEffect(() => {
    if (afterLogIn && room !== null && !booked && !write.busy) {
      setAfterLogIn(false);
      write.run(room);
    }
  }, [afterLogIn, room, booked, write]);
  return {
    write,
    booked,
    bookedRoom,
    onLoggedIn: () => {
      setAfterLogIn(true);
    },
  };
}

export function useGroupBooking(of: GroupBookingOf): GroupBooking {
  const { group, slot, loggedIn, shown, party, out } = of;
  const { all, reload } = useRoomTimes(group, slot, loggedIn);
  const free = all === null ? null : freeRooms(all, group.room.space.seatNos, slot);
  const ready = out?.status === 'ready';
  const placed = roomOnReady(of.sent, free ?? []);
  // Booked, the room is the one booked, or the one sent: never one chosen or read afresh (#657, booked card).
  const done = isBooked(party.request);
  const kept = ready || done ? placed.room : (of.chosen ?? free?.[0]?.NAME ?? null);
  const noRoom = ready && free !== null && free.length === 0 ? noRoomOf(group, all ?? [], slot) : null;
  const nextFree = noRoom?.again ?? null;
  const times = free?.find(({ NAME }) => NAME === kept) ?? null;
  const useDesc = out?.useDesc ?? of.use;
  const toBook =
    loggedIn && times !== null && useDesc !== null && out !== null ? { room: times, useDesc, request: out } : null;
  const { write, booked, bookedRoom, onLoggedIn } = useBooking(of, toBook, reload);
  const room = bookedRoom ?? (done ? (of.sent ?? kept) : kept);
  const [againAt, setAgainAt] = useState<string | null>(null);
  const { change, locked } = shown;
  useEffect(() => {
    // Once the request is taken back and the answer let go, the answer is asked again at the next free time.
    if (againAt !== null && out === null && !locked) {
      change((input) => withStart(input, againAt));
      setAgainAt(null);
    }
  }, [againAt, out, locked, change]);
  return {
    free,
    room,
    line: ready ? readyLineOf(loggedIn, placed.switched) : null,
    sentence: noRoom?.words ?? waitWords(group, slot, now()),
    again: nextFree === null ? null : againWords(nextFree, slot.minutes),
    booking: booked || write.busy || (loggedIn && (times === null || useDesc === null)),
    booked,
    failure: write.failure,
    logIn: write.logIn,
    onBook: () => {
      if (toBook !== null && !booked) {
        write.run(toBook);
      }
    },
    onLoggedIn,
    onAgain: () => {
      if (nextFree !== null) {
        setAgainAt(nextFree);
        party.cancel?.();
      }
    },
  };
}
