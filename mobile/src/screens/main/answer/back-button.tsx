/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, Icon, radius, shadow, size } from '@/design-system';
import { ANSWER_TOP, listsTop } from '../layout';

export const BACK_LABEL = '뒤로';

// In the time bar's head: the button's square at the bar's top left, beside the words, which keep its room.
const ON_BAR = 36;
const ON_BAR_INSET = 4;
// The words of the bar's head start this far right of the bar's padding, clear of the button.
export const BACK_ROOM = ON_BAR + ON_BAR_INSET * 2 - 16;

interface BackButtonProps {
  onPress: () => void;
  // The time bar is shown: the button stands in its head; else it is a round button over the map.
  onBar: boolean;
}

// "←" at the top left of every answer (rule 2 of the 2026-11-22 redesign): inside the time bar's head when the answer
// has a time, a round button over the map when it has none. It closes the answer and keeps the conversation, as
// Android's back and dragging the docked card down do.
export function BackButton({ onPress, onBar }: BackButtonProps): ReactElement {
  const { top } = useSafeAreaInsets();
  const at = listsTop(top);
  return (
    <Pressable
      accessibilityLabel={BACK_LABEL}
      accessibilityRole="button"
      hitSlop={(size.touchMin - ON_BAR) / 2}
      onPress={onPress}
      style={({ pressed }) => [
        onBar
          ? [styles.onBar, { top: at + ON_BAR_INSET, left: ANSWER_TOP.side + ON_BAR_INSET }]
          : [styles.round, { top: at, left: ANSWER_TOP.side }],
        pressed && styles.pressed,
      ]}
      testID="answer-back"
    >
      <Icon color={color.ink} name="chevronLeft" size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  onBar: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: ON_BAR,
    height: ON_BAR,
    borderRadius: radius.full,
  },
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
