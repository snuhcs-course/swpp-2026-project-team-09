/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { color, Icon } from '@/design-system';

const SIZE = 36;

// The round ✕ of the answer frame's pill and of a received invitation's card.
export function CloseButton({ label, onPress }: { label: string; onPress: () => void }): ReactElement {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.close}>
      <Icon color={color.ink} name="x" size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  close: {
    alignItems: 'center',
    justifyContent: 'center',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: color.surfaceSunken,
  },
});
