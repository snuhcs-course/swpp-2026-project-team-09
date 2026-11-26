/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StudyGroup } from '@/api/study-plan-types';
import { color, space, text } from '@/design-system';
import type { Slot } from '@/library/cards/payloads';
import type { RoomCount, RoomCounts } from '@/library/cards/seat-rooms';
import { rangeWords } from '@/library/cards/times';
import { type FloorCell, FloorCells } from './floor-cells';

// The room ticket's left cell opened (P10 ticket 10; design group-study-design ④): each floor's kinds of group study
// room as equal cells, the name at the left and its free rooms at the right, read from the library when the chooser
// opens. A kind that does not fit the people is grey with why ("6명부터"); the kind of the answer is outlined, by its
// id, since 2층 and 4층 both have a 6인실.

type Kind = StudyGroup['rooms'][number];

function countWords(count: RoomCount | undefined): { shown: string; said: string } {
  if (typeof count === 'number') {
    const rooms = `빈 방 ${String(count)}`;
    return { shown: rooms, said: rooms };
  }
  // A count not read yet, or not read at all, leaves its place empty.
  return count === 'failed' ? { shown: '—', said: '빈 방 모름' } : { shown: '', said: '' };
}

function cellOf(kind: Kind, chosen: string, counts: RoomCounts, onChoose: (spaceId: string) => void): FloorCell {
  const label = `${String(kind.floor)}층 ${kind.name}`;
  const base = { key: kind.spaceId, floor: kind.floor, name: kind.name, label, chosen: kind.spaceId === chosen };
  if (!kind.fits) {
    const reason = kind.reason ?? '';
    return { ...base, value: reason, said: reason, off: true, few: false, onPress: () => undefined };
  }
  const count = counts?.get(kind.spaceId);
  const { shown, said } = countWords(count);
  return {
    ...base,
    value: shown,
    said,
    off: count === 0,
    few: false,
    onPress: () => {
      onChoose(kind.spaceId);
    },
  };
}

export function RoomKindChooser({
  group,
  slot,
  counts,
  onChoose,
}: {
  group: StudyGroup;
  slot: Slot;
  // The free rooms of each kind for the time, by its id; null without a library session.
  counts: RoomCounts;
  onChoose: (spaceId: string) => void;
}): ReactElement {
  return (
    <View style={styles.chooser}>
      <Text style={styles.basis}>{`${rangeWords(slot.start, slot.minutes)}에 빈 방`}</Text>
      <FloorCells cells={group.rooms.map((kind) => cellOf(kind, group.room.spaceId, counts, onChoose))} />
    </View>
  );
}

const styles = StyleSheet.create({
  chooser: { gap: space[2] },
  basis: { ...text.caption, color: color.inkMuted },
});
