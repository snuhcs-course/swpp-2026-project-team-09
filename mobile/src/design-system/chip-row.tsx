/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Chip } from './chip';
import { space } from './tokens';

export interface CountedChip<Key extends string> {
  key: Key;
  label: string;
  count: number;
}

interface ChipRowProps<Key extends string> {
  chips: readonly CountedChip<Key>[];
  selected: Key;
  onSelect: (key: Key) => void;
  // Hides a chip whose count is 0, unless it is the selected one.
  hideEmpty?: boolean;
}

// A row of filters that scrolls sideways, each chip with its count: "전체 12", "공강 4".
export function ChipRow<Key extends string>({
  chips,
  selected,
  onSelect,
  hideEmpty = false,
}: ChipRowProps<Key>): ReactElement {
  const shown = hideEmpty ? chips.filter(({ key, count }) => count > 0 || key === selected) : chips;
  return (
    <ScrollView
      contentContainerStyle={styles.row}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
    >
      {shown.map(({ key, label, count }) => (
        <Chip
          key={key}
          onPress={() => {
            onSelect(key);
          }}
          selected={key === selected}
        >
          {`${label} ${count}`}
        </Chip>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { alignItems: 'center', gap: space[2], minHeight: 56, paddingHorizontal: space[5] },
});
