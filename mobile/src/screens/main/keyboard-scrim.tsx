/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Keyboard, Pressable, StyleSheet } from 'react-native';

// A transparent scrim over the stage while the keyboard is up, under the AI input's own parts: a press beside them
// only puts the keyboard down. It takes the touch as it starts, so that a drag puts the keyboard down too and the map
// under it does not pan.
export function KeyboardScrim(): ReactElement {
  return (
    <Pressable
      accessibilityLabel="키보드 내리기"
      accessibilityRole="button"
      onPressIn={() => {
        Keyboard.dismiss();
      }}
      style={styles.scrim}
    />
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill },
});
