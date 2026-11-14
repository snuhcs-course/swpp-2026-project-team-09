/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { color, radius, space, text } from './tokens';

export interface GridChoice {
  key: string;
  name: string;
  // The one fact that decides the choice, such as "350m"; "" for none.
  value: string;
  // The value in the faint ink, as for a fact that is not known.
  faint: boolean;
  // What a screen reader says of the cell: the whole fact.
  label: string;
}

interface ChoiceGridProps {
  choices: readonly GridChoice[];
  disabled: boolean;
  onChoose: (key: string) => void;
}

const COLUMNS = 2;
const CELL_HEIGHT = 44;

function Cell({
  choice,
  disabled,
  onChoose,
}: {
  choice: GridChoice;
  disabled: boolean;
  onChoose: (key: string) => void;
}): ReactElement {
  const { key, name, value, faint, label } = choice;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        onChoose(key);
      }}
      style={({ pressed }): StyleProp<ViewStyle> => [
        styles.cell,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text numberOfLines={1} style={styles.name}>
        {name}
      </Text>
      <Text numberOfLines={1} style={[styles.value, faint && styles.faint]}>
        {value}
      </Text>
    </Pressable>
  );
}

// A list of choices inside a card: two columns of equal cells, filled row by row, each with a name at the left and
// the one value that decides the choice at the right, so that the names and the values stand in straight columns.
export function ChoiceGrid({ choices, disabled, onChoose }: ChoiceGridProps): ReactElement {
  const rows = Array.from({ length: Math.ceil(choices.length / COLUMNS) }, (_, row) =>
    choices.slice(row * COLUMNS, (row + 1) * COLUMNS),
  );
  return (
    <View style={styles.grid} testID="choice-grid">
      {rows.map((row) => (
        <View key={row.map(({ key }) => key).join(' ')} style={styles.row}>
          {row.map((choice) => (
            <Cell choice={choice} disabled={disabled} key={choice.key} onChoose={onChoose} />
          ))}
          {/* An odd last cell keeps its column's width. */}
          {row.length < COLUMNS ? <View style={styles.empty} testID="choice-grid-empty" /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: space[2] },
  row: { flexDirection: 'row', gap: space[2] },
  cell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: CELL_HEIGHT,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  pressed: { backgroundColor: color.blue50 },
  disabled: { opacity: 0.5 },
  name: { ...text.label, flexShrink: 1, color: color.ink },
  // The rest of the cell, so that the value is what gives way first.
  value: { ...text.caption, flex: 1, color: color.inkMuted, textAlign: 'right' },
  faint: { color: color.inkSubtle },
  empty: { flex: 1 },
});
