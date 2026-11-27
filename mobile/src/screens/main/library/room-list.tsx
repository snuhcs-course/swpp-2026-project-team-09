/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LibrarySpace } from '@/api/assistant-types';
import { color, font, radius, space, text } from '@/design-system';
import type { Slot } from '@/library/cards/payloads';
import { type CellCount, cellOf, type Room, roomGrid, roomOf, spacesOf } from '@/library/cards/seat-rooms';
import { rangeWords } from '@/library/cards/times';
import { LOG_IN_FOR_SEATS } from '../study-rows';
import type { RoomCounting } from './room-counting';
import { type Rooms, useRooms } from './use-room-counts';

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

function RoomCell({
  room,
  spaces,
  rooms,
  inUse,
  onPick,
}: {
  room: Room;
  spaces: readonly LibrarySpace[];
  rooms: Extract<Rooms, { state: 'listed' }>;
  inUse: boolean;
  onPick: (space: LibrarySpace) => void;
}): ReactElement {
  const { count, pick } = cellOf(spaces, rooms.counts);
  const { shown, said } = countWords(count);
  const full = pick === null;
  const few = count.kind === 'free' && count.free < FEW;
  return (
    <Pressable
      accessibilityLabel={said === '' ? room.label : `${room.label} ${said}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: full, selected: inUse }}
      disabled={full}
      onPress={() => {
        if (pick !== null) {
          onPick(pick);
        }
      }}
      style={({ pressed }) => [styles.cell, inUse && styles.inUse, full && styles.full, pressed && styles.pressed]}
    >
      <Text numberOfLines={1} style={[styles.cellName, full && styles.fullWords]}>
        {room.cell}
      </Text>
      {shown === '' ? null : (
        <Text style={[styles.cellCount, few && styles.few, full && styles.fullWords]}>{shown}</Text>
      )}
    </Pressable>
  );
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
      {rooms.state === 'unlisted' ? <Text style={styles.basis}>열람실 목록을 불러오지 못했어요</Text> : null}
      {rooms.state === 'listed' ? <Floors inUse={inUse} onPick={onPick} rooms={rooms} /> : null}
    </View>
  );
}

// Two cells to a row, so that every cell has the same width on every floor.
const PER_ROW = 2;

function pairs<T>(cells: readonly T[]): T[][] {
  return Array.from({ length: Math.ceil(cells.length / PER_ROW) }, (_, row) =>
    cells.slice(row * PER_ROW, row * PER_ROW + PER_ROW),
  );
}

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
  return (
    <>
      {floors.map((floor, column) => {
        const cells = rows.flatMap(({ cells: byFloor }) => {
          const room = byFloor[column];
          return room === null || room === undefined ? [] : [room];
        });
        return (
          <View key={floor} style={styles.floor}>
            <Text style={styles.floorName}>{`${String(floor)}층`}</Text>
            {pairs(cells).map((pair) => (
              <View key={pair.map(({ kind }) => kind).join(' ')} style={styles.row}>
                {Array.from({ length: PER_ROW }, (_, index) => {
                  const room = pair[index];
                  return (
                    <View key={room?.kind ?? `empty-${String(index)}`} style={styles.place}>
                      {room === undefined ? null : (
                        <RoomCell
                          inUse={inUse !== null && inUse.floor === room.floor && inUse.kind === room.kind}
                          onPick={onPick}
                          room={room}
                          rooms={rooms}
                          spaces={spacesOf(room, rooms.sectors)}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        );
      })}
    </>
  );
}

const CELL_HEIGHT = 44;

const styles = StyleSheet.create({
  list: { gap: space[2] },
  basis: { ...text.caption, color: color.inkMuted },
  floor: { gap: space[1] },
  floorName: { ...text.caption, color: color.inkMuted },
  row: { flexDirection: 'row', gap: space[2] },
  place: { flex: 1, flexBasis: 0, minWidth: 0 },
  pressed: { opacity: 0.6 },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[1],
    minHeight: CELL_HEIGHT,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  // The room on screen: the study colour's border.
  inUse: { borderWidth: 1.5, borderColor: color.svcStudy },
  full: { backgroundColor: color.surfaceSunken, borderColor: color.surfaceSunken },
  cellName: { flexShrink: 1, ...text.label, color: color.ink },
  cellCount: { fontFamily: font.semiBold, fontSize: 13, lineHeight: 20, color: color.svcStudy },
  few: { color: color.danger },
  fullWords: { color: color.inkMuted, fontFamily: font.regular },
});
