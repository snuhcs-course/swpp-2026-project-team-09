/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, color, Icon, space } from '@/design-system';
import type { StepBack } from '../library/act-stage';

// The armed step of a destructive act beside the input (P01 ticket 21, the user's choice 가-3 of 2026-11-27): at the
// left a round grey ✕, with no words, that steps back to the first state and does nothing; at the right the act's own
// red button over the rest of the row, both of one height. The ✕ is at the left on purpose: the card's own ✕, top right,
// closes the answer, and the red button stands where the link was not, so that two presses on one spot never act.
// Every armed step of a card goes through this row.

// The dock's `bar` button's height, which the ✕ takes too.
const HEIGHT = 50;

export function ConfirmRow({
  action,
  back,
}: {
  action: { words: string; onPress: () => void; disabled: boolean };
  back: StepBack;
}): ReactElement {
  return (
    <View style={styles.row} testID="confirm-row">
      <Pressable
        accessibilityLabel={back.label}
        accessibilityRole="button"
        hitSlop={space[1]}
        onPress={back.onPress}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        testID="confirm-back"
      >
        <Icon color={color.inkMuted} name="x" size={20} />
      </Pressable>
      <View style={styles.action}>
        <Button disabled={action.disabled} full onPress={action.onPress} size="bar" variant="danger">
          {action.words}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  back: {
    width: HEIGHT,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surfaceSunken,
  },
  pressed: { opacity: 0.6 },
  action: { flex: 1, minWidth: 0 },
});
