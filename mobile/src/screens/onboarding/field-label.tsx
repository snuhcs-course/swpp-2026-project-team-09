/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, space, text } from '@/design-system';

// The words above a field. A screen reader reads the field's own label, which says the same.
export function FieldLabel({ children }: { children: string }): ReactElement {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{children}</Text>
    </View>
  );
}

const ROW_HEIGHT = 20;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[1], minHeight: ROW_HEIGHT },
  label: { ...text.label, color: color.ink },
});
