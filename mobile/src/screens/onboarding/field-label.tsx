/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, space, text } from '@/design-system';

interface FieldLabelProps {
  children: string;
  // Marks a field that has to be filled in before saving.
  required?: boolean;
}

// The words above a field. A screen reader reads the field's own label, which says the same.
export function FieldLabel({ children, required = false }: FieldLabelProps): ReactElement {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{children}</Text>
      {required ? (
        <Text accessibilityElementsHidden aria-hidden importantForAccessibility="no" style={styles.star}>
          *
        </Text>
      ) : null}
    </View>
  );
}

const ROW_HEIGHT = 20;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[1], minHeight: ROW_HEIGHT },
  label: { ...text.label, color: color.ink },
  star: { ...text.label, color: color.danger },
});
