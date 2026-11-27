/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { color, font, Icon, kindTone, radius, shadow, size } from '@/design-system';
import { MADE_LINE } from './layout';

// The line over the input of a Quest made from a Plan, which says what its flag says and opens its card after
// inviting. It stands at the left above what else stands there over the AI input.
export function MadeQuestLine({
  bottom,
  words,
  onPress,
}: {
  bottom: number;
  words: string;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={(size.touchMin - MADE_LINE.height) / 2}
      onPress={onPress}
      style={({ pressed }) => [styles.line, { bottom }, pressed && styles.pressed]}
      testID="made-quest-line"
    >
      <Icon color={kindTone.party.ink} name="flag" size={14} />
      <Text style={styles.words}>{words}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    left: MADE_LINE.left,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: MADE_LINE.height,
    paddingRight: 12,
    paddingLeft: 10,
    borderWidth: 1,
    borderColor: kindTone.party.soft,
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  pressed: { backgroundColor: kindTone.party.soft },
  words: { fontFamily: font.semiBold, fontSize: 13, lineHeight: 18, color: kindTone.party.ink },
});
