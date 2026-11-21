/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { color, radius, size, space, text } from '@/design-system';

const CHIP_HEIGHT = 34;
const HIT_SLOP = (size.touchMin - CHIP_HEIGHT) / 2;

// A small chip of the dock's row for what the docked card keeps folded: "지난 답 N개", or the answer's note. A press
// raises the card with it open.
export function DockChip({ words, onPress }: { words: string; onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={words}
      accessibilityRole="button"
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      <Text numberOfLines={1} style={styles.words}>
        {words}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexShrink: 1,
    justifyContent: 'center',
    height: CHIP_HEIGHT,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    backgroundColor: color.surfaceSunken,
  },
  pressed: { opacity: 0.6 },
  words: { ...text.label, color: color.inkMuted },
});
