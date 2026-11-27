/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, space, text } from '@/design-system';
import type { Slot } from '@/library/cards/payloads';
import { rangeWords } from '@/library/cards/times';
import type { LibraryRoomTimes } from '@/library/replies';
import { CellRows, cellStyles } from './floor-cells';

// The room ticket's right cell opened (P10 ticket 10; design group-study-design ⑤): the rooms of the kind free for the
// whole time, three to a row, each its number alone in the middle. The first free room is the one chosen until another
// is pressed.

const PER_ROW = 3;

export function RoomNumberChooser({
  rooms,
  chosen,
  slot,
  onChoose,
}: {
  // The kind's rooms free for the whole time, in the site's order.
  rooms: readonly LibraryRoomTimes[];
  // The room on the ticket, by its number ("G412").
  chosen: string | null;
  slot: Slot;
  onChoose: (name: string) => void;
}): ReactElement {
  const cells = rooms.map(({ NAME }) => ({ key: NAME, name: NAME }));
  return (
    <View style={styles.chooser}>
      <Text style={styles.basis}>{`${rangeWords(slot.start, slot.minutes)}에 빈 방 ${String(rooms.length)}곳`}</Text>
      <CellRows
        cells={cells}
        draw={({ name }) => (
          <Pressable
            accessibilityLabel={name}
            accessibilityRole="button"
            accessibilityState={{ selected: name === chosen }}
            onPress={() => {
              onChoose(name);
            }}
            style={({ pressed }) => [
              cellStyles.cell,
              styles.middle,
              name === chosen && cellStyles.chosen,
              pressed && cellStyles.pressed,
            ]}
          >
            <Text style={cellStyles.name}>{name}</Text>
          </Pressable>
        )}
        perRow={PER_ROW}
        testID="room-number-row"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chooser: { gap: space[2] },
  basis: { ...text.caption, color: color.inkMuted },
  middle: { justifyContent: 'center' },
});
