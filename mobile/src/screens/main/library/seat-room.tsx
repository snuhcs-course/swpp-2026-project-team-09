/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LibraryCardData, LibrarySpace } from '@/api/assistant-types';
import { color, space as spacing, text } from '@/design-system';
import type { CardRoom } from '@/features/assistant/use-chat';
import { seatBookCardOf } from '@/library/cards/made';
import type { Slot } from '@/library/cards/payloads';
import { basisOf, type Room, roomOf, shortName, swapFor } from '@/library/cards/seat-rooms';
import { type ChipTone, RoomChipRow, RoomList } from './room-list';
import type { LibraryCardActions } from './use-library-call';
import { type Rooms, useRoomCounts } from './use-room-counts';

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
  counting: ReturnType<typeof useRoomCounts>;
  choose: (next: LibrarySpace) => void;
  // 되돌리기, while the room on screen is not the one the card first showed.
  undo: (() => void) | null;
  // Shows a room swapped in for the card's own, which was full.
  swap: (next: LibrarySpace) => void;
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

// `setNamed` sets the seat the card offers: the card's own back in its own room, none in another.
export function useSeatRoom(of: SeatRoomOf, slot: Slot, setNamed: (seat: string | null) => void): SeatRoom {
  const { card, space, place, actions } = of;
  const [listing, setListing] = useState(false);
  const counting = useRoomCounts(slot);
  const kept = actions.roomOf(place);
  const shown = kept?.space ?? space;
  const first = kept?.first ?? space;
  const full = kept?.full ?? null;
  const show = (room: Omit<CardRoom, 'key'>): void => {
    const key = room.space.id === space.id ? card.key : seatBookCardOf(room.space, null, slot, card.notes).key;
    actions.showRoom(place, room.space.id === space.id && room.full === null ? null : { ...room, key });
  };
  const choose = (next: LibrarySpace): void => {
    setNamed(next.id === space.id ? card.seat : null);
    setListing(false);
    show({ space: next, first, full });
  };
  return {
    chip: of.adjustable ? null : roomOf(space),
    shown,
    full,
    listing,
    setListing,
    tone: toneOf(listing, shown.id !== space.id, of.roomNamed ?? false),
    counting,
    choose,
    undo:
      shown.id === first.id
        ? null
        : () => {
            choose(first);
          },
    swap: (next) => {
      setNamed(null);
      show({ space: next, first: next, full: space });
    },
  };
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
                setListing(false);
              }
            : null
        }
        room={roomOf(room.shown) ?? chip}
        tone={room.tone}
      />
      {listing ? <RoomList onPick={room.choose} rooms={counting.rooms} shown={room.shown} slot={slot} /> : null}
    </>
  );
}

// What the card says of the room on screen: the seat space filled with its free seats, the room swapped out when it
// was full, and why this space of its room.
export function RoomWords({
  shown,
  free,
  full,
  rooms,
}: {
  shown: LibrarySpace;
  free: number | null;
  full: LibrarySpace | null;
  rooms: Rooms;
}): ReactElement {
  const basis = rooms.state === 'listed' ? basisOf(shown, rooms.sectors, rooms.counts) : null;
  return (
    <View style={styles.words}>
      <Text style={styles.filled}>
        {free === null ? shortName(shown) : `${shortName(shown)} · 빈 자리 ${String(free)}석`}
      </Text>
      {full === null ? null : <Text style={styles.why}>{`${shortName(full)}은 그 시간에 다 찼어요`}</Text>}
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
