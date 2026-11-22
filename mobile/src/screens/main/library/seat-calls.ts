/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useState } from 'react';
import type { LibraryCardData } from '@/api/assistant-types';
import type { CardOutcome } from '@/features/assistant/use-chat';
import type { Slot } from '@/library/cards/payloads';
import type { LibrarySeat } from '@/library/replies';
import { useAskForPush } from '@/push/push-ask-host';
import { type Booking, readKeyOf, SEATS_WAIT_MS, sendBooking, withinWait } from './seat-booking';
import type { Closed } from './seat-offer';
import type { SeatRoom } from './seat-room';
import {
  type LibraryCardActions,
  type Loaded,
  pendingMark,
  useLibraryLoad,
  useLogInReload,
  useWrite,
  type Write,
} from './use-library-call';
import { seatsFor } from './use-room-counts';
import { useSeatStay } from './use-seat-stay';

// The seat card's reads and its booking (moved out of `book-seat-card.tsx` with P01 ticket 06): the seats read for the
// room and time on screen, and the booking sent only for the room and time its seat was read for.

export const CLOSED: Readonly<Record<Closed, CardOutcome>> = {
  booked: { kind: 'booked', words: '예약했어요' },
  declined: { kind: 'declined', words: '예약하지 않았어요' },
};

// After 예약하기 or 닫기: the chat keeps how the card ended, and a booking asks for push.
function useClose(actions: LibraryCardActions, place: string): (closed: Closed) => void {
  const askForPush = useAskForPush();
  return (closed) => {
    actions.finish(place, CLOSED[closed]);
    if (closed === 'booked') {
      askForPush();
    }
  };
}

interface SeatCalling {
  card: LibraryCardData;
  actions: LibraryCardActions;
  place: string;
  room: SeatRoom;
  slot: Slot;
  setNamed: (seat: string | null) => void;
}

// The seats' reading and the booking's write for the room and time on screen.
export function useSeatCalls({ card, actions, place, room, slot, setNamed }: SeatCalling): {
  loaded: Loaded<readonly LibrarySeat[]>;
  // While a new time or room is read, the seats last read, for the eye only: never offered, never sent (P01 ticket
  // 06, PR 500's review).
  last: readonly LibrarySeat[] | null;
  reload: () => void;
  write: Write<LibrarySeat>;
  close: (closed: Closed) => void;
  logIn: () => void;
} {
  const { shown } = room;
  const close = useClose(actions, place);
  const mapped = actions.bandOnBar?.(place) === true;
  const key = readKeyOf(shown, slot);
  const read = useLibraryLoad(async () => {
    const seats = await (mapped ? withinWait(seatsFor(shown, slot), SEATS_WAIT_MS) : seatsFor(shown, slot));
    return { key, seats };
  }, key);
  // The seats count only for the room and time they were read for, from the render the key changes in.
  const loaded = currentOf(read.loaded, key);
  const hold = useSeatStay();
  const readFor = loaded.state === 'ready' ? key : null;
  const booking: Booking = {
    card,
    space: shown,
    slot,
    actions,
    close,
    choose: setNamed,
    reload: read.reload,
    hold,
    readFor,
  };
  const write = useWrite<LibrarySeat>(
    (seat, press) => sendBooking(booking, seat, press),
    undefined,
    pendingMark(actions, place),
  );
  const [last, setLast] = useState<readonly LibrarySeat[] | null>(null);
  if (loaded.state === 'ready' && last !== loaded.value) {
    setLast(loaded.value);
  }
  const logIn = useLogInReload(read.reload);
  return { loaded, last: loaded.state === 'loading' ? last : null, reload: read.reload, write, close, logIn };
}

// A read's seats while they are the room's and time's on screen; a read for another is still loading.
function currentOf(
  loaded: Loaded<{ key: string; seats: readonly LibrarySeat[] }>,
  key: string,
): Loaded<readonly LibrarySeat[]> {
  if (loaded.state !== 'ready') {
    return loaded;
  }
  return loaded.value.key === key ? { state: 'ready', value: loaded.value.seats } : { state: 'loading' };
}
