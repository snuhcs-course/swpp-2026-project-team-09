/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, color, font, Icon, radius, space } from '@/design-system';

// A row of the room's people: a face with the Leader's crown, the name with another mark, a line, and the row's
// buttons. A line parts it from the next row.

export interface PersonRowProps {
  name: string;
  department: string;
  line: string | null;
  lineInk?: string;
  leader?: boolean;
  // Beside the name, such as `전에 내보낸 멤버`.
  mark?: string;
  dimmed?: boolean;
  // The list's last row, with no line under it.
  last?: boolean;
  onPress?: () => void;
  children?: ReactNode;
}

export function PersonRow({
  name,
  department,
  line,
  lineInk,
  leader = false,
  mark,
  dimmed = false,
  last = false,
  onPress,
  children,
}: PersonRowProps): ReactElement {
  const words = (
    <>
      <View style={[styles.face, dimmed && styles.dimmed]}>
        <Avatar name={name} />
        {leader ? (
          <View accessibilityLabel="파티장" accessible style={styles.crown}>
            <Icon color={color.onPrimary} name="crown" size={12} />
          </View>
        ) : null}
      </View>
      <View style={styles.words}>
        <View style={styles.nameLine}>
          <Text style={styles.name}>{name}</Text>
          {mark === undefined ? null : <Text style={styles.markPill}>{mark}</Text>}
          <Text style={styles.department}>{department}</Text>
        </View>
        {line === null ? null : <Text style={[styles.line, { color: lineInk ?? color.inkMuted }]}>{line}</Text>}
      </View>
    </>
  );
  return (
    <View style={[styles.row, last && styles.lastRow]} testID="person-row">
      {onPress === undefined ? (
        <View style={styles.person}>{words}</View>
      ) : (
        <Pressable
          accessibilityLabel={`${name}${leader ? ' · 파티장' : ''}${line === null ? '' : ` · ${line}`}`}
          accessibilityRole="button"
          onPress={onPress}
          style={styles.person}
        >
          {words}
        </Pressable>
      )}
      {children}
    </View>
  );
}

const CROWN = 20;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  lastRow: { borderBottomWidth: 0 },
  person: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 64 },
  face: { borderRadius: radius.full },
  dimmed: { opacity: 0.6 },
  crown: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    alignItems: 'center',
    justifyContent: 'center',
    width: CROWN,
    height: CROWN,
    borderWidth: 2,
    borderColor: color.surface,
    borderRadius: radius.full,
    backgroundColor: '#E8A400',
  },
  words: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  name: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 22, color: color.ink },
  markPill: {
    paddingHorizontal: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: color.surfaceSubtle,
    fontFamily: font.bold,
    fontSize: 11,
    lineHeight: 18,
    color: color.inkMuted,
  },
  department: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  line: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
});
