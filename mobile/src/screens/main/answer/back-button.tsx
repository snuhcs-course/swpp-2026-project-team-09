/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, Icon, radius, shadow, space } from '@/design-system';
import { ANSWER_TOP, listsTop } from '../layout';

export const BACK_LABEL = '뒤로';

// Under the time bar, this far below its card.
export const BACK_GAP = space[2];

// The round button's top, from the stage's top: the lists' top, or under the time bar `bar` high (0 for none).
export function backTop(inset: number, bar: number): number {
  return listsTop(inset) + (bar > 0 ? bar + BACK_GAP : 0);
}

// What "←" keeps from the stage's top: down to the round button's bottom.
export function backBottom(inset: number, bar: number): number {
  return backTop(inset, bar) + ANSWER_TOP.height;
}

interface BackButtonProps {
  onPress: () => void;
  // The time bar's height, which the button stands under; 0 for none.
  under: number;
}

// "←" at the top left of every answer: one round button over the map, at the lists' top when the answer has no time,
// directly under the time bar's card when it has one, never inside the bar (P04 ticket 52). It closes the answer and
// keeps the conversation, as Android's back and dragging the card down do.
export function BackButton({ onPress, under }: BackButtonProps): ReactElement {
  const { top } = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityLabel={BACK_LABEL}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.round,
        { top: backTop(top, under), left: ANSWER_TOP.side },
        pressed && styles.pressed,
      ]}
      testID="answer-back"
    >
      <Icon color={color.ink} name="chevronLeft" size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  round: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: ANSWER_TOP.height,
    height: ANSWER_TOP.height,
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  pressed: { opacity: 0.6 },
});
