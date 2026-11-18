/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Keyboard, Pressable, StyleSheet } from 'react-native';

function putDown(): void {
  Keyboard.dismiss();
}

// A transparent scrim over the stage while the keyboard is up: a press on it only puts the keyboard down. It takes the
// touch as it starts, so that a drag puts the keyboard down too and the map under it does not pan. A screen reader's
// double tap sends only the press.
export function KeyboardScrim(): ReactElement {
  return (
    <Pressable
      accessibilityLabel="키보드 내리기"
      accessibilityRole="button"
      onPress={putDown}
      onPressIn={putDown}
      style={styles.scrim}
    />
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill },
});
