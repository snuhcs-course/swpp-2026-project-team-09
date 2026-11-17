/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { color, font, Icon, radius, shadow, size } from '@/design-system';
import { INTERESTS_HINT } from '../layout';

export const INTERESTS_HINT_WORDS = '관심을 맡기면 맞는 행사를 알려 드려요';

// The line over the input for a User of the first run who watches no interest (P05 ticket 09): it opens the
// interests card again. It stands at the left above the row of buttons or in its place, and above the tutorial's
// start button when that is shown.
export function InterestsHint({ bottom, onPress }: { bottom: number; onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={(size.touchMin - INTERESTS_HINT.height) / 2}
      onPress={onPress}
      style={({ pressed }) => [styles.hint, { bottom }, pressed && styles.pressed]}
    >
      <Icon color={color.snuBlue} name="bell" size={14} />
      <Text style={styles.words}>{INTERESTS_HINT_WORDS}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hint: {
    position: 'absolute',
    left: INTERESTS_HINT.left,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: INTERESTS_HINT.height,
    paddingRight: 12,
    paddingLeft: 10,
    borderWidth: 1,
    borderColor: color.blue100,
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  pressed: { backgroundColor: color.blue50 },
  words: { fontFamily: font.semiBold, fontSize: 13, lineHeight: 18, color: color.snuBlue },
});
