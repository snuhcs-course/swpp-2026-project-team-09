/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { Profile } from '@/api/types';
import { color, Icon, radius, size, space, text } from '@/design-system';
import { FieldLabel } from './field-label';

export type FromAccount = Profile['fromAccount'];

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

// The grey line under the fields that the account fills, or nothing when it fills none.
export function AccountLine({ fromAccount }: { fromAccount: FromAccount }): ReactElement | null {
  if (fromAccount.name && fromAccount.department) {
    return <Text style={styles.line}>이름과 학과는 SNU 계정에서 가져와요</Text>;
  }
  if (fromAccount.name || fromAccount.department) {
    return <Text style={styles.line}>{fromAccount.name ? '이름은' : '학과는'} SNU 계정에서 가져와요</Text>;
  }
  return null;
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
