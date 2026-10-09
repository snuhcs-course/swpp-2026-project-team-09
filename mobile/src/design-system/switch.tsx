/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Switch as NativeSwitch, StyleSheet, Text, View } from 'react-native';
import { color, font, space } from './tokens';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  // What a screen reader says, such as "친구와 위치 공유".
  label: string;
  disabled?: boolean;
}

// The design system's switch: navy while on. A screen reader reads it as a switch.
export function Switch({ value, onValueChange, label, disabled = false }: SwitchProps): ReactElement {
  return (
    <NativeSwitch
      accessibilityLabel={label}
      disabled={disabled}
      ios_backgroundColor={color.borderStrong}
      onValueChange={onValueChange}
      thumbColor={color.surface}
      trackColor={{ false: color.borderStrong, true: color.snuBlue }}
      value={value}
    />
  );
}

interface SwitchRowProps extends SwitchProps {
  // Under the label, such as "12명".
  description?: string;
}

// A row with a label, an optional description and a switch at its end.
export function SwitchRow({ description, ...props }: SwitchRowProps): ReactElement {
  return (
    <View style={styles.row}>
      <View style={styles.words}>
        <Text style={styles.label}>{props.label}</Text>
        {description === undefined ? null : <Text style={styles.description}>{description}</Text>}
      </View>
      <Switch {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 56 },
  words: { flex: 1, gap: 2 },
  label: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 22, color: color.ink },
  description: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
});
