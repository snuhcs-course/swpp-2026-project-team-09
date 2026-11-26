/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { LibraryCardData, LibrarySpace } from '@/api/assistant-types';
import { color, space as spacing, text } from '@/design-system';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { now } from '@/clock';
import { koreaDateKey } from '@/korea-time';
import { seatBookCardOf } from '@/library/cards/made';
import type { Slot } from '@/library/cards/payloads';
import { sameSlot } from '@/library/cards/slot-band';
import { nextStart } from '@/library/cards/times';
import { type Room, roomOf, shortName, swapFor } from '@/library/cards/seat-rooms';
import { RoomList } from './room-list';
import { SeatTicket } from './seat-ticket';
import type { LibraryCardActions } from './use-library-call';
import type { RoomCounting } from './room-counting';
import { type Rooms, useRoomCounts, useRooms, useRoomsWith } from './use-room-counts';

// The room of a seat card the Assistant gave: the room on screen, kept with the chat so that it outlasts the sheet and
// later requests send the card of that room; the ticket and the list under it that change it; and the swap of a room
// that is full for the card's time.

export interface SeatRoomOf {
  card: LibraryCardData;
  space: LibrarySpace;
  place: string;
  // A card the app gave for a tapped seat, which has no ticket.
  adjustable: boolean;
  actions: LibraryCardActions;
}

export interface SeatRoom {
  // The ticket's room as the card came; null for a card without the ticket.
  chip: Room | null;
  shown: LibrarySpace;
  // The card's own room, when it was full and another was swapped in.
  full: LibrarySpace | null;
  listing: boolean;
  setListing: (listing: boolean) => void;
  counting: RoomCounting;
  choose: (next: LibrarySpace) => void;
  // Shows a room swapped in for the card's own, which was full.
  swap: (next: LibrarySpace) => void;
  // The card's time and the seat it offers, as kept with the chat.
  slot: Slot;
  setSlot: (slot: Slot) => void;
  named: string | null;
  setNamed: (seat: string | null) => void;
}

// The card's own time: the card's, else the next 30 minutes today for two hours.
export function cardSlot(card: LibraryCardData, at: Date): Slot {
  return {
    date: card.date ?? koreaDateKey(at),
    start: card.start ?? nextStart(at),
    minutes: card.minutes ?? 120,
  };
}

// What the card shows, kept with the chat: its room, its time and its seat. The card as it came is kept as nothing;
// anything changed is kept with the key of the book card as it is on screen, which later requests send back.
export interface Shown {
  space: LibrarySpace;
  first: LibrarySpace;
  full: LibrarySpace | null;
  slot: Slot;
  seat: string | null;
}

type Kept = Pick<LibraryCardActions, 'roomOf' | 'showRoom'>;

// What a card at `place` shows, and how a change is kept, from the chat alone: the card's own time is `own`. The time
// bar and the flag of a booking on the map (P04 ticket 07) read and change it as the card does.
export function keptRoom(
  { card, space, place }: Pick<SeatRoomOf, 'card' | 'space' | 'place'>,
  actions: Kept,
  own: Slot,
): { kept: Shown; keep: (next: Partial<Shown>) => void } {
  const room = actions.roomOf(place);
  const kept: Shown = {
    space: room?.space ?? space,
    first: room?.first ?? space,
    full: room?.full ?? null,
    slot: room?.slot ?? own,
    seat: room === null || room.seat === undefined ? card.seat : room.seat,
  };
  const keep = (next: Partial<Shown>): void => {
    const all = { ...kept, ...next };
    const asCame = all.space.id === space.id && all.full === null && sameSlot(all.slot, own) && all.seat === card.seat;
    const key = seatBookCardOf(all.space, all.seat, all.slot, card.notes).key;
    actions.showRoom(place, asCame ? null : { ...all, key });
  };
  return { kept, keep };
}

function useKept(of: SeatRoomOf): { kept: Shown; keep: (next: Partial<Shown>) => void } {
  const [own] = useState(() => cardSlot(of.card, now()));
  return keptRoom(of, of.actions, own);
}

// The room on screen, the time and the seat the card offers, all kept with the chat; the seat the card named comes back
// with its own room, and another room starts without one. A new time reads the rooms' counts again once they were read.
export function useSeatRoom(of: SeatRoomOf): SeatRoom {
  const { card, space } = of;
  const [listing, setListing] = useState(false);
  const { kept, keep } = useKept(of);
  const { slot, full } = kept;
  const counting = useRoomCounts(slot);
  useRecount(counting, slot);
  const choose = (next: LibrarySpace): void => {
    setListing(false);
    keep({ space: next, seat: next.id === space.id ? card.seat : null });
  };
  return {
    chip: of.adjustable ? null : roomOf(space),
    shown: kept.space,
    full,
    listing,
    setListing,
    counting,
    choose,
    swap: (next) => {
      keep({ space: next, first: next, full: space, seat: null });
    },
    slot,
    setSlot: (next) => {
      keep({ slot: next });
    },
    named: kept.seat,
    setNamed: (seat) => {
      keep({ seat });
    },
  };
}

// The counts read again for a new time, once they were read for the old one.
function useRecount(counting: RoomCounting, slot: Slot): void {
  const time = `${slot.date} ${slot.start} ${String(slot.minutes)}`;
  const [seen, setSeen] = useState(time);
  const counted = useRoomsWith(counting, (rooms) => rooms.state !== 'idle');
  const { read } = counting;
  useEffect(() => {
    if (seen !== time) {
      setSeen(time);
      if (counted) {
        void read();
      }
    }
  }, [seen, time, counted, read]);
}

// While the card's own room shows no free seat for its time (`ownEmpty`), the rooms are read and the space of the same
// kind with the most free seats, else the one with the most, is swapped in. True while that is looked for; false once
// none was found, and the card says that no seat is free.
export function useFullRoomSwap(room: SeatRoom, space: LibrarySpace, ownEmpty: boolean): boolean {
  const [noneFree, setNoneFree] = useState(false);
  const ownFull = room.chip !== null && room.shown.id === space.id && room.full === null && ownEmpty;
  useEffect(() => {
    let current = true;
    if (ownFull) {
      void room.counting.read().then((read) => {
        const swapped = read.state === 'listed' ? swapFor(space, read.sectors, read.counts) : null;
        if (!current) {
          return;
        }
        if (swapped === null) {
          setNoneFree(true);
        } else {
          room.swap(swapped);
        }
      });
    }
    return (): void => {
      current = false;
    };
    // Read once each time the card's own room is found full.
  }, [ownFull]);
  return ownFull && !noneFree;
}

// What the ticket shows of the seat offered: the room's free seats, the seat, and how the seat picture opens.
export interface TicketSeat {
  free: number | null;
  seat: string | null;
  onSeat: (() => void) | null;
}

export const NO_TICKET_SEAT: TicketSeat = { free: null, seat: null, onSeat: null };

// The ticket, and the list under it while it is open, in the time band's place (P01 ticket 09).
export function RoomTop({ room, slot, seat }: { room: SeatRoom; slot: Slot; seat: TicketSeat }): ReactElement | null {
  const { chip, listing, setListing, counting } = room;
  const closeList = useCallback((): void => {
    // The counts still on their way change nothing more (P01 ticket 08).
    counting.stop();
    setListing(false);
  }, [counting, setListing]);
  // Android's back closes the open list before anything else of the answer (P01 ticket 04).
  useBackToClose(listing, closeList, { edge: false });
  if (chip === null) {
    return null;
  }
  return (
    <>
      <SeatTicket
        free={seat.free}
        onRoom={() => {
          if (listing) {
            closeList();
          } else {
            void counting.read();
            setListing(true);
          }
        }}
        onSeat={listing ? null : seat.onSeat}
        open={listing}
        room={(roomOf(room.shown) ?? chip).label}
        seat={seat.seat}
      />
      {listing ? <RoomList counting={counting} onPick={room.choose} shown={room.shown} slot={slot} /> : null}
    </>
  );
}

// Whether the room swapped out as full has free seats at the time on screen, by the counts read for that time.
function freeAgain(full: LibrarySpace, rooms: Rooms): boolean {
  const count = rooms.state === 'listed' ? rooms.counts?.get(full.id) : undefined;
  return typeof count === 'number' && count > 0;
}

// What the card says of the room on screen beyond its ticket: the room swapped out when it was full for the time, while
// it still is.
export function RoomWords({
  full,
  counting,
}: {
  full: LibrarySpace | null;
  counting: RoomCounting;
}): ReactElement | null {
  // Read here, so that a count that arrives draws these words and not the card around them (P01 ticket 08).
  const rooms = useRooms(counting);
  if (full === null || freeAgain(full, rooms)) {
    return null;
  }
  return <Text style={styles.why}>{`${shortName(full)}은 그 시간에 다 찼어요`}</Text>;
}

const styles = StyleSheet.create({
  why: { ...text.caption, color: color.inkMuted, paddingHorizontal: spacing[1] },
});
