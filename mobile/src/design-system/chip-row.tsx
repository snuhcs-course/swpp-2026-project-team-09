/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-25  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { color, eventText, radius, size, space } from './tokens';

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

// A row of filters that scrolls sideways, each with its count: "전체 12", "공강 4". The filters are words, the chosen
// one bold in navy on light blue, as the 행사 tab draws its own; a bare `Chip` stays the pill that picks things.
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
      {shown.map(({ key, label, count }) => {
        const chosen = key === selected;
        const words = `${label} ${count}`;
        return (
          <Pressable
            accessibilityLabel={words}
            accessibilityRole="button"
            accessibilityState={{ selected: chosen }}
            hitSlop={HIT_SLOP}
            key={key}
            onPress={() => {
              onSelect(key);
            }}
            style={({ pressed }) => [styles.tab, chosen && styles.chosen, pressed && styles.pressed]}
          >
            <Text numberOfLines={1} style={chosen ? styles.chosenWords : styles.words}>
              {words}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// A tab is drawn 40 high, as the 행사 tab's are; its touch area reaches the design system's 48 within the row.
const TAB_HEIGHT = space[10];
const SLOP = (size.touchMin - TAB_HEIGHT) / 2;
const HIT_SLOP = { top: SLOP, bottom: SLOP };
const ROW_PADDING = 10;

const styles = StyleSheet.create({
  // The room above and below the tabs is padding on the scroller itself: Android does not size a sideways scroller to
  // its content's minHeight, so the row would touch what is above it. The row is 60 high, as the 행사 tab's.
  scroll: { flexGrow: 0, paddingVertical: ROW_PADDING },
  row: { alignItems: 'center', gap: space[1], paddingHorizontal: space[5] },
  tab: { justifyContent: 'center', height: TAB_HEIGHT, paddingHorizontal: space[4], borderRadius: radius.md },
  chosen: { backgroundColor: color.blue100 },
  pressed: { opacity: 0.6 },
  words: { ...eventText.filter, color: color.inkMuted },
  chosenWords: { ...eventText.filterChosen, color: color.snuBlue },
});
