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
import { StyleSheet, Text, View } from 'react-native';
import type { LibraryCardData, LibrarySpace } from '@/api/assistant-types';
import { color, space as spacing, text } from '@/design-system';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { now } from '@/clock';
import { koreaDateKey } from '@/korea-time';
import { seatBookCardOf } from '@/library/cards/made';
import type { Slot } from '@/library/cards/payloads';
import { sameSlot } from '@/library/cards/slot-band';
import { nextStart } from '@/library/cards/times';
import { basisOf, type Room, roomOf, shortName, swapFor } from '@/library/cards/seat-rooms';
import { type ChipTone, RoomChipRow, RoomList } from './room-list';
import type { LibraryCardActions } from './use-library-call';
import type { RoomCounting } from './room-counting';
import { type Rooms, useRoomCounts, useRooms, useRoomsWith } from './use-room-counts';

// The room of a seat card the Assistant gave: the room on screen, kept with the chat so that it outlasts the sheet and
// later requests send the card of that room; the chip and the list that change it; and the swap of a room that is full
// for the card's time.

export interface SeatRoomOf {
  card: LibraryCardData;
  space: LibrarySpace;
  place: string;
  // A card the app gave for a tapped seat, which has no room chip.
  adjustable: boolean;
  roomNamed?: boolean;
  actions: LibraryCardActions;
}

export interface SeatRoom {
  // The chip's room; null for a card without the chip.
  chip: Room | null;
  shown: LibrarySpace;
  // The card's own room, when it was full and another was swapped in.
  full: LibrarySpace | null;
  listing: boolean;
  setListing: (listing: boolean) => void;
  tone: ChipTone;
  counting: RoomCounting;
  choose: (next: LibrarySpace) => void;
  // 되돌리기, while the room on screen is not the one the card first showed.
  undo: (() => void) | null;
  // Shows a room swapped in for the card's own, which was full.
  swap: (next: LibrarySpace) => void;
  // The card's time and the seat it offers, as kept with the chat.
  slot: Slot;
  setSlot: (slot: Slot) => void;
  named: string | null;
  setNamed: (seat: string | null) => void;
}

function toneOf(listing: boolean, changed: boolean, named: boolean): ChipTone {
  if (listing) {
    return 'open';
  }
  if (changed) {
    return 'changed';
  }
  return named ? 'named' : 'plain';
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
  const { slot, first, full } = kept;
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
    tone: toneOf(listing, kept.space.id !== space.id, of.roomNamed ?? false),
    counting,
    choose,
    undo:
      kept.space.id === first.id
        ? null
        : () => {
            choose(first);
          },
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

// The chip row, and the list in the time band's place while it is open.
export function RoomTop({ room, slot }: { room: SeatRoom; slot: Slot }): ReactElement | null {
  const { chip, listing, setListing, counting } = room;
  const closeList = useCallback((): void => {
    setListing(false);
  }, [setListing]);
  // Android's back closes the open list before anything else of the answer (P01 ticket 04).
  useBackToClose(listing, closeList, { edge: false });
  if (chip === null) {
    return null;
  }
  return (
    <>
      <RoomChipRow
        onChip={() => {
          if (!listing) {
            void counting.read();
          }
          setListing(!listing);
        }}
        onKeep={
          listing
            ? () => {
                // The counts still on their way change nothing more (P01 ticket 08).
                counting.stop();
                setListing(false);
              }
            : null
        }
        room={roomOf(room.shown) ?? chip}
        tone={room.tone}
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

// The space filled and its free seats: "7A 노트북존 · 빈 자리 31석". The name is left out where the chip above already
// says it ("7층 열람실"), so the room is named once (P01 ticket 03).
function filledWords(shown: LibrarySpace, free: number | null): string | null {
  const name = shortName(shown);
  const said = roomOf(shown)?.label === name;
  if (free === null) {
    return said ? null : name;
  }
  return said ? `빈 자리 ${String(free)}석` : `${name} · 빈 자리 ${String(free)}석`;
}

// What the card says of the room on screen: the seat space filled with its free seats, the room swapped out when it
// was full, and why this space of its room.
export function RoomWords({
  shown,
  free,
  full,
  counting,
}: {
  shown: LibrarySpace;
  free: number | null;
  full: LibrarySpace | null;
  counting: RoomCounting;
}): ReactElement {
  // Read here, so that a count that arrives draws these words and not the card around them (P01 ticket 08).
  const rooms = useRooms(counting);
  const basis = rooms.state === 'listed' ? basisOf(shown, rooms.sectors, rooms.counts) : null;
  const filled = filledWords(shown, free);
  return (
    <View style={styles.words}>
      {filled === null ? null : <Text style={styles.filled}>{filled}</Text>}
      {full === null || freeAgain(full, rooms) ? null : (
        <Text style={styles.why}>{`${shortName(full)}은 그 시간에 다 찼어요`}</Text>
      )}
      {basis === null ? null : (
        <>
          <Text style={styles.why}>{basis.why}</Text>
          <Text style={styles.why}>{basis.counts}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  words: { gap: 2, paddingHorizontal: spacing[1] },
  filled: { ...text.label, color: color.quest },
  why: { ...text.caption, color: color.inkMuted },
});
