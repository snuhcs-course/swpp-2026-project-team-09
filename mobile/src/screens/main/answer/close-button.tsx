/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { color, Icon, type IconName } from '@/design-system';

const SIZE = 36;

interface RoundButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  filled?: boolean;
}

// A round icon button of the answer frame: ✕ and 그만.
export function RoundButton({ icon, label, onPress, filled = false }: RoundButtonProps): ReactElement {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.close}>
      <Icon color={color.ink} filled={filled} name={icon} size={18} />
    </Pressable>
  );
}

// The round ✕ of the answer frame's pill and of a received invitation's card.
export function CloseButton({ label, onPress }: { label: string; onPress: () => void }): ReactElement {
  return <RoundButton icon="x" label={label} onPress={onPress} />;
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
