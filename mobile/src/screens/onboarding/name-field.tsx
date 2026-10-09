/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, space, text } from '@/design-system';
import { FieldLabel } from './field-label';
import { LONGEST_NAME } from './form';
import { Input } from './input';
import { lengthOf } from './length';

interface NameFieldProps {
  value: string;
  // The name is still the one the sign-in suggested.
  suggested?: boolean;
  onChange: (name: string) => void;
}

// The User's name, up to 30 characters, with its count.
export function NameField({ value, suggested = false, onChange }: NameFieldProps): ReactElement {
  return (
    <View style={styles.field}>
      <FieldLabel required suggested={suggested}>
        이름
      </FieldLabel>
      <Input label="이름" most={LONGEST_NAME} onChangeText={onChange} placeholder="이름" value={value} />
      <Text accessibilityLabel={`${lengthOf(value)}자, 최대 ${LONGEST_NAME}자`} style={styles.count}>
        {`${lengthOf(value)}/${LONGEST_NAME}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[2] },
  count: { ...text.caption, alignSelf: 'flex-end', color: color.inkMuted },
});
