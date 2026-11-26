/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, radius, space, text } from '@/design-system';

// The equal cells of a ticket's chooser, floor by floor (P01 ticket 09's room list, P10 ticket 10's room kinds): each
// floor's name over rows of two cells of the same width, each one line with a name at the left and the one fact that
// decides the choice at the right.

export interface FloorCell {
  key: string;
  floor: number;
  // What the cell shows, and what a screen reader names it.
  name: string;
  label: string;
  // The fact at the right; "" leaves its place empty.
  value: string;
  // What a screen reader hears after the name; "" for nothing.
  said: string;
  // The one on screen: the study colour's border.
  chosen: boolean;
  // Cannot be chosen: on the sunken ground, its words plain.
  off: boolean;
  // The fact in the danger colour.
  few: boolean;
  onPress: () => void;
}

function Cell({ cell }: { cell: FloorCell }): ReactElement {
  const { name, label, value, said, chosen, off, few, onPress } = cell;
  return (
    <Pressable
      accessibilityLabel={said === '' ? label : `${label} ${said}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, selected: chosen }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [styles.cell, chosen && styles.chosen, off && styles.off, pressed && styles.pressed]}
    >
      <Text numberOfLines={1} style={[styles.name, off && styles.offWords]}>
        {name}
      </Text>
      {value === '' ? null : <Text style={[styles.value, few && styles.few, off && styles.offWords]}>{value}</Text>}
    </Pressable>
  );
}

// Two cells to a row, so that every cell has the same width on every floor.
const PER_ROW = 2;

function rowsOf<T>(cells: readonly T[], perRow: number): T[][] {
  return Array.from({ length: Math.ceil(cells.length / perRow) }, (_, row) =>
    cells.slice(row * perRow, row * perRow + perRow),
  );
}

// The cells in rows of `perRow`, an odd last row keeping each cell's width.
export function CellRows<T extends { key: string }>({
  cells,
  perRow,
  draw,
  testID,
}: {
  cells: readonly T[];
  perRow: number;
  draw: (cell: T) => ReactElement;
  testID?: string;
}): ReactElement {
  return (
    <>
      {rowsOf(cells, perRow).map((row) => (
        <View key={row.map(({ key }) => key).join(' ')} style={styles.row} testID={testID}>
          {Array.from({ length: perRow }, (_, index) => {
            const one = row[index];
            return (
              <View key={one?.key ?? `empty-${String(index)}`} style={styles.place}>
                {one === undefined ? null : draw(one)}
              </View>
            );
          })}
        </View>
      ))}
    </>
  );
}

// The floors in the order their cells come, each with its name.
export function FloorCells({ cells }: { cells: readonly FloorCell[] }): ReactElement {
  const floors = [...new Set(cells.map(({ floor }) => floor))];
  return (
    <>
      {floors.map((floor) => (
        <View key={floor} style={styles.floor}>
          <Text style={styles.floorName}>{`${String(floor)}층`}</Text>
          <CellRows
            cells={cells.filter((cell) => cell.floor === floor)}
            draw={(cell) => <Cell cell={cell} />}
            perRow={PER_ROW}
          />
        </View>
      ))}
    </>
  );
}

export const CELL_HEIGHT = 44;

export const cellStyles = StyleSheet.create({
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
  chosen: { borderWidth: 1.5, borderColor: color.svcStudy },
  pressed: { opacity: 0.6 },
  name: { flexShrink: 1, fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.ink },
});

const styles = StyleSheet.create({
  ...cellStyles,
  floor: { gap: space[1] },
  floorName: { ...text.caption, color: color.inkMuted },
  row: { flexDirection: 'row', gap: space[2] },
  place: { flex: 1, flexBasis: 0, minWidth: 0 },
  off: { backgroundColor: color.surfaceSunken, borderColor: color.surfaceSunken },
  value: { fontFamily: font.semiBold, fontSize: 13, lineHeight: 20, color: color.svcStudy },
  few: { color: color.danger },
  offWords: { color: color.inkMuted, fontFamily: font.regular },
});
