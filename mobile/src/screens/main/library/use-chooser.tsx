/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { CellRows, cellStyles } from './floor-cells';

// The use of a group study room (P10 ticket 10; design group-study-design ③): the library asks for one of its uses,
// shown as equal cells under the ticket's use line. The use chosen is kept on the phone and is the one chosen next
// time, while the kind offers it ("한 번 고른 용도는 다음에도 기억합니다").

const KEPT_USE = 'kwanjeong.useDesc';
const PER_ROW = 2;

export async function keepUse(use: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEPT_USE, use);
  } catch {
    // Asked again next time.
  }
}

// The use kept from last time, when the kind offers it; null otherwise.
export async function keptUse(options: readonly string[]): Promise<string | null> {
  try {
    const kept = await AsyncStorage.getItem(KEPT_USE);
    return kept !== null && options.includes(kept) ? kept : null;
  } catch {
    return null;
  }
}

export function UseChooser({
  options,
  chosen,
  onChoose,
}: {
  options: readonly string[];
  chosen: string | null;
  onChoose: (use: string) => void;
}): ReactElement {
  return (
    <CellRows
      cells={options.map((option) => ({ key: option }))}
      draw={({ key }) => (
        <Pressable
          accessibilityLabel={key}
          accessibilityRole="button"
          accessibilityState={{ selected: key === chosen }}
          onPress={() => {
            onChoose(key);
          }}
          style={({ pressed }) => [
            cellStyles.cell,
            styles.middle,
            key === chosen && cellStyles.chosen,
            pressed && cellStyles.pressed,
          ]}
        >
          <Text style={cellStyles.name}>{key}</Text>
        </Pressable>
      )}
      perRow={PER_ROW}
    />
  );
}

const styles = StyleSheet.create({
  middle: { justifyContent: 'center' },
});
