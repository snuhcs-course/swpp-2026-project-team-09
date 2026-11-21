/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { AnswerLine } from '@/api/assistant-types';
import { color, font, radius, size, space, text } from '@/design-system';

const CHIP_HEIGHT = 34;
const HIT_SLOP = (size.touchMin - CHIP_HEIGHT) / 2;

// A small chip of the dock's row for what the docked card keeps folded: "지난 답 N개", or the answer's note. A press
// raises the card with it open. A reply's buttons take the same chip (an offer, 다시 시도, a Lookup's ask), disabled
// while the next reply is on its way, for they act on the turn before.
export function DockChip({
  words,
  onPress,
  disabled = false,
}: {
  words: string;
  onPress: () => void;
  disabled?: boolean;
}): ReactElement {
  return (
    <Pressable
      accessibilityLabel={words}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text numberOfLines={1} style={styles.words}>
        {words}
      </Text>
    </Pressable>
  );
}

// The dock's line (board 8), at most two lines and cut there, ended by "›", which a press opens to the whole reply in
// the raised card. Two lines, not one (P04 ticket 18): one sentence of the model fits, its question included.
const LINES = 2;

export function DockLine({ line, onPress }: { line: AnswerLine; onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityHint="전체 보기"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.line, pressed && styles.pressed]}
      testID="dock-line"
    >
      <Text ellipsizeMode="tail" numberOfLines={LINES} style={styles.lineWords} testID="dock-line-words">
        {line.map(({ text: words, strong }, part) => (
          // The parts have no id, and their order is their meaning.
          // oxlint-disable-next-line react/no-array-index-key
          <Text key={part} style={strong ? styles.strong : undefined}>
            {words}
          </Text>
        ))}
      </Text>
      <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.more}>
        ›
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
  disabled: { opacity: 0.4 },
  words: { ...text.label, color: color.inkMuted },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    flexShrink: 1,
    gap: space[1],
    minHeight: CHIP_HEIGHT,
  },
  lineWords: { ...text.body, flexShrink: 1, color: color.ink },
  more: { ...text.body, color: color.inkMuted },
  strong: { fontFamily: font.bold, color: color.snuBlue },
});
