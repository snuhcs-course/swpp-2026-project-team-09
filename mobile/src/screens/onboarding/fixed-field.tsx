/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { color, Icon, radius, size, space, text } from '@/design-system';
import { FieldLabel } from './field-label';

// A field the SNU account fills, shown in an input's place and not editable.
export function FixedField({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <View style={styles.field}>
      <FieldLabel>{label}</FieldLabel>
      <View style={styles.box}>
        <TextInput
          accessibilityLabel={label}
          accessibilityState={{ disabled: true }}
          editable={false}
          style={styles.value}
          value={value}
        />
        <Icon color={color.inkSubtle} name="lock" size={16} />
      </View>
    </View>
  );
}

// The name and the department, fixed, with the grey line that says where they come from.
export function AccountFields({ name, department }: { name: string; department: string }): ReactElement {
  return (
    <>
      <FixedField label="이름" value={name} />
      <FixedField label="학과" value={department} />
      <Text style={styles.line}>이름과 학과는 SNU 계정에서 가져와요</Text>
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[2] },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: size.touchMin,
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surfaceSunken,
  },
  value: { ...text.bodyLg, flex: 1, paddingVertical: 0, color: color.ink },
  line: { ...text.caption, marginTop: -space[2], color: color.inkMuted },
});
