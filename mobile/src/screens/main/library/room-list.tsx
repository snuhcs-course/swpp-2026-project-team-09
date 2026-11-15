/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LibrarySpace } from '@/api/assistant-types';
import { color, font, Icon, radius, space, text } from '@/design-system';
import type { Slot } from '@/library/cards/payloads';
import { type CellCount, cellOf, type Room, roomGrid, roomOf, spacesOf } from '@/library/cards/seat-rooms';
import { rangeWords } from '@/library/cards/times';
import { LOG_IN_FOR_SEATS } from '../study-rows';
import { CellGrid } from './cell-grid';
import type { Rooms } from './use-room-counts';

// The seat card's room: its chip, which names the floor and kind in use and opens the list, and the list, one cell
// per kind of room on each floor with the free seats of the seat space a tap fills.

// Plain when the Assistant picked the room, the User's own when their words named it, changed after a switch or a
// swap, and open while the list shows.
export type ChipTone = 'plain' | 'named' | 'changed' | 'open';

const INK: Readonly<Record<ChipTone, string>> = {
  plain: color.ink,
  named: color.snuBlue,
  changed: color.quest,
  open: color.snuBlue,
};

const LABELS = StyleSheet.create({
  plain: { color: INK.plain },
  named: { color: INK.named },
  changed: { color: INK.changed },
  open: { color: INK.open },
});

export function RoomChipRow({
  room,
  tone,
  onChip,
  onKeep,
}: {
  room: Room;
  tone: ChipTone;
  onChip: () => void;
  // 그대로, while the list is open.
  onKeep: (() => void) | null;
}): ReactElement {
  const ink = INK[tone];
  return (
    <View style={styles.chipRow}>
      <Pressable
        accessibilityLabel={`열람실: ${room.label}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: tone === 'open' }}
        hitSlop={6}
        onPress={onChip}
        style={({ pressed }) => [styles.chip, styles[tone], pressed && styles.pressed]}
        testID={`room-chip-${tone}`}
      >
        <Text style={[styles.chipLabel, LABELS[tone]]}>{room.label}</Text>
        <Icon color={ink} name="chevronDown" size={14} />
      </Pressable>
      {onKeep === null ? null : (
        <Pressable accessibilityLabel="그대로" accessibilityRole="button" hitSlop={8} onPress={onKeep}>
          <Text style={styles.keep}>그대로</Text>
        </Pressable>
      )}
    </View>
  );
}

const COUNT_WORDS: Readonly<Record<Exclude<CellCount['kind'], 'free'>, { shown: string; said: string }>> = {
  none: { shown: '', said: '' },
  pending: { shown: '…', said: '빈 자리 확인 중' },
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
      {shown === '' ? null : <Text style={[styles.cellCount, full && styles.fullWords]}>{shown}</Text>}
    </Pressable>
  );
}

// The list in the card, in the time band's place: what to choose and for what time, then the grid.
export function RoomList({
  rooms,
  shown,
  slot,
  onPick,
}: {
  rooms: Rooms;
  // The seat space on screen, whose room is outlined.
  shown: LibrarySpace;
  slot: Slot;
  onPick: (space: LibrarySpace) => void;
}): ReactElement {
  const inUse = roomOf(shown);
  return (
    <View style={styles.list}>
      <View>
        <Text style={styles.ask}>어느 열람실로 할까요?</Text>
        <Text style={styles.basis}>{`빈 자리는 ${rangeWords(slot.start, slot.minutes)} 기준이에요`}</Text>
        {rooms.state === 'listed' && rooms.counts === null ? (
          <Text style={styles.basis}>{LOG_IN_FOR_SEATS}</Text>
        ) : null}
      </View>
      {rooms.state === 'unlisted' ? <Text style={styles.basis}>열람실 목록을 불러오지 못했어요</Text> : null}
      {rooms.state === 'listed' ? <Grid inUse={inUse} onPick={onPick} rooms={rooms} /> : null}
    </View>
  );
}

function Grid({
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
    <CellGrid
      heads={floors.map((floor) => `${String(floor)}층`)}
      rows={rows.map(({ cells }, index) => ({
        key: cells.find((room) => room !== null)?.kind ?? String(index),
        cells: cells.map((room) =>
          room === null ? null : (
            <RoomCell
              inUse={inUse !== null && inUse.floor === room.floor && inUse.kind === room.kind}
              onPick={onPick}
              room={room}
              rooms={rooms}
              spaces={spacesOf(room, rooms.sectors)}
            />
          ),
        ),
      }))}
    />
  );
}

const CHIP_HEIGHT = 32;
const CELL_HEIGHT = 44;

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: CHIP_HEIGHT,
    paddingLeft: space[3],
    paddingRight: space[2],
    borderRadius: radius.full,
    borderWidth: 1,
  },
  plain: { borderColor: color.borderStrong, backgroundColor: color.surface },
  named: { borderColor: color.snuBlue, backgroundColor: color.blue50 },
  changed: { borderColor: color.quest, backgroundColor: color.questSoft },
  open: { borderColor: color.snuBlue, backgroundColor: color.blue100 },
  pressed: { opacity: 0.6 },
  chipLabel: { ...text.label },
  keep: { ...text.label, color: color.blue600 },
  list: { gap: space[3] },
  ask: { ...text.label, color: color.ink },
  basis: { ...text.caption, color: color.inkMuted },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[1],
    height: CELL_HEIGHT,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  inUse: { borderColor: color.snuBlue, backgroundColor: color.blue50 },
  full: { backgroundColor: color.surfaceSunken, borderColor: color.surfaceSunken },
  cellName: { flexShrink: 1, fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.ink },
  cellCount: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.snuBlue },
  fullWords: { color: color.inkMuted },
});
