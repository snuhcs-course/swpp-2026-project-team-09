/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, space } from '@/design-system';
import { LineIcon, type LineIconName } from '../line-icon';

// A field's navy icon on a light navy square, before its name, as the frame marks the 파티 form's fields.
export function FieldIcon({ name }: { name: LineIconName }): ReactElement {
  return (
    <View style={styles.icon}>
      <LineIcon name={name} size={ICON} tint={color.snuBlue} />
    </View>
  );
}

// A field's name, after its icon when it has one, and, on the right, its hint: "게시판 · 모집글이 올라갈 곳".
export function FieldHead({ label, hint, icon }: { label: string; hint?: string; icon?: LineIconName }): ReactElement {
  return (
    <View style={styles.head}>
      <View style={styles.name}>
        {icon === undefined ? null : <FieldIcon name={icon} />}
        <Text style={styles.label}>{label}</Text>
      </View>
      {hint === undefined || hint === '' ? null : <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

// The frame's square, 26 with corners of 8, and its icon, 16.
const SQUARE = 26;
const CORNER = 8;
const ICON = 16;

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: SQUARE,
    height: SQUARE,
    borderRadius: CORNER,
    backgroundColor: color.blue50,
  },
  label: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.ink },
  hint: { fontFamily: font.medium, fontSize: 12, lineHeight: 20, color: color.inkMuted },
});
