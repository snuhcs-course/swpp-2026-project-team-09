/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LibrarySpace } from '@/api/assistant-types';
import { color, space, text } from '@/design-system';
import type { Slot } from '@/library/cards/payloads';
import { type CellCount, cellOf, type Room, roomGrid, roomOf, spacesOf } from '@/library/cards/seat-rooms';
import { rangeWords } from '@/library/cards/times';
import { LOG_IN_FOR_SEATS } from '../study-rows';
import { type FloorCell, FloorCells } from './floor-cells';
import type { RoomCounting } from './room-counting';
import { type Rooms, useRooms } from './use-room-counts';
import { FAILURE } from '../answer/line-types';

// The seat card's room list, under its ticket (P01 ticket 09, board 다): the time the free seats are for, then one row
// per floor of equal cells, each one line with the kind of room and the free seats of the seat space a tap fills.

// Fewer free seats than this are said in the danger colour.
const FEW = 10;

const COUNT_WORDS: Readonly<Record<Exclude<CellCount['kind'], 'free'>, { shown: string; said: string }>> = {
  none: { shown: '', said: '' },
  // A count not read yet leaves its place empty, and fills in where it stands.
  pending: { shown: '', said: '빈 자리 확인 중' },
  failed: { shown: '—', said: '빈 자리 모름' },
  full: { shown: '만석', said: '만석' },
};

// What a cell shows at its right, and what it says to a screen reader.
function countWords(count: CellCount): { shown: string; said: string } {
  if (count.kind === 'free') {
    const seats = `${String(count.free)}석`;
    return { shown: seats, said: seats };
  }
  return COUNT_WORDS[count.kind];
}

function cellOfRoom(
  room: Room,
  rooms: Extract<Rooms, { state: 'listed' }>,
  inUse: boolean,
  onPick: (space: LibrarySpace) => void,
): FloorCell {
  const { count, pick } = cellOf(spacesOf(room, rooms.sectors), rooms.counts);
  const { shown, said } = countWords(count);
  return {
    key: `${String(room.floor)} ${room.kind}`,
    floor: room.floor,
    name: room.cell,
    label: room.label,
    value: shown,
    said,
    chosen: inUse,
    off: pick === null,
    few: count.kind === 'free' && count.free < FEW,
    onPress: () => {
      if (pick !== null) {
        onPick(pick);
      }
    },
  };
}

// The list under the ticket: the time its free seats are for, then the floors.
export function RoomList({
  counting,
  shown,
  slot,
  onPick,
}: {
  // The counts read for the card's time, which only this list draws as they arrive (P01 ticket 08).
  counting: RoomCounting;
  // The seat space on screen, whose room is outlined.
  shown: LibrarySpace;
  slot: Slot;
  onPick: (space: LibrarySpace) => void;
}): ReactElement {
  const rooms = useRooms(counting);
  const inUse = roomOf(shown);
  return (
    <View style={styles.list}>
      <Text style={styles.basis}>{`${rangeWords(slot.start, slot.minutes)}에 빈 자리`}</Text>
      {rooms.state === 'listed' && rooms.counts === null ? <Text style={styles.basis}>{LOG_IN_FOR_SEATS}</Text> : null}
      {rooms.state === 'unlisted' ? <Text style={styles.failed}>열람실 목록을 불러오지 못했어요</Text> : null}
      {rooms.state === 'listed' ? <Floors inUse={inUse} onPick={onPick} rooms={rooms} /> : null}
    </View>
  );
}

// The floors in the grid's order, each with its rooms.
function Floors({
  rooms,
  inUse,
  onPick,
}: {
  rooms: Extract<Rooms, { state: 'listed' }>;
  inUse: Room | null;
  onPick: (space: LibrarySpace) => void;
}): ReactElement {
  const { floors, rows } = roomGrid(rooms.sectors);
  const cells = floors.flatMap((_floor, column) =>
    rows.flatMap(({ cells: byFloor }) => {
      const room = byFloor[column];
      if (room === null || room === undefined) {
        return [];
      }
      const shown = inUse !== null && inUse.floor === room.floor && inUse.kind === room.kind;
      return [cellOfRoom(room, rooms, shown, onPick)];
    }),
  );
  return <FloorCells cells={cells} />;
}

const styles = StyleSheet.create({
  list: { gap: space[2] },
  basis: { ...text.caption, color: color.inkMuted },
  // A failure, as every failure line is (P01 ticket 19).
  failed: FAILURE,
});
