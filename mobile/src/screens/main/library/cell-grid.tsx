/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, space, text } from '@/design-system';

// Choices in a card as cells of equal width on a grid, never wrapped pills of uneven width: a head over each column,
// then the rows, with an empty place where a row has no cell in that column.

export interface GridRow {
  key: string;
  // One per column, in the heads' order; null leaves the place empty.
  cells: readonly (ReactNode | null)[];
}

export function CellGrid({ heads, rows }: { heads: readonly string[]; rows: readonly GridRow[] }): ReactElement {
  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        {heads.map((head) => (
          <Text key={head} style={[styles.place, styles.head]}>
            {head}
          </Text>
        ))}
      </View>
      {rows.map(({ key, cells }) => (
        <View key={key} style={styles.row}>
          {heads.map((head, column) => (
            <View key={head} style={styles.place}>
              {cells[column] ?? null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: space[2] },
  row: { flexDirection: 'row', gap: space[2] },
  place: { flex: 1, flexBasis: 0, minWidth: 0 },
  head: { ...text.caption, color: color.inkMuted },
});
