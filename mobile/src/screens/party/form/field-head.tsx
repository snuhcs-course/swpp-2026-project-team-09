import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font } from '@/design-system';

// A field's name and, on the right, its hint: "게시판 · 모집글이 올라갈 곳".
export function FieldHead({ label, hint }: { label: string; hint?: string }): ReactElement {
  return (
    <View style={styles.head}>
      <Text style={styles.label}>{label}</Text>
      {hint === undefined || hint === '' ? null : <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  label: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.ink },
  hint: { fontFamily: font.medium, fontSize: 12, lineHeight: 20, color: color.inkMuted },
});
