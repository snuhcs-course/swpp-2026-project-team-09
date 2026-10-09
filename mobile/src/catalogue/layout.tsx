/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, space, text } from '@/design-system';

// One component of the catalogue, under its name.
export function Section({ name, children }: { name: string; children: ReactNode }): ReactElement {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.name}>
        {name}
      </Text>
      {children}
    </View>
  );
}

// Variants side by side, wrapping.
export function Row({ children, gap }: { children: ReactNode; gap?: number }): ReactElement {
  return <View style={[styles.row, gap === undefined ? null : { gap }]}>{children}</View>;
}

const styles = StyleSheet.create({
  section: { gap: space[3] },
  name: { ...text.title, color: color.ink },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space[3],
  },
});
