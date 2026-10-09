/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, radius, space } from './tokens';

export interface Segment<Key extends string> {
  key: Key;
  label: string;
  // A count after the name, such as the 2 of "내 파티 2". Without it, or at 0, none.
  count?: number;
  // The count in red, for what waits for an answer: "초대 1".
  alert?: boolean;
}

interface SegmentedTabsProps<Key extends string> {
  segments: readonly Segment<Key>[];
  selected: Key;
  onSelect: (key: Key) => void;
}

// The tabs under an app bar, as the `Party` frame draws them: the selected one in navy, underlined.
export function SegmentedTabs<Key extends string>({
  segments,
  selected,
  onSelect,
}: SegmentedTabsProps<Key>): ReactElement {
  return (
    <View accessibilityRole="tablist" style={styles.row}>
      {segments.map(({ key, label, count, alert = false }) => {
        const current = key === selected;
        const counted = count !== undefined && count > 0;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: current }}
            key={key}
            onPress={() => {
              onSelect(key);
            }}
            style={styles.tab}
          >
            <Text style={[styles.label, current && styles.current]}>{label}</Text>
            {counted ? (
              <Text style={[styles.count, current && styles.countCurrent, alert && styles.countAlert]}>{count}</Text>
            ) : null}
            {current ? <View style={styles.underline} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const COUNT = 20;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: space[3], backgroundColor: color.surface },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48 },
  label: { fontFamily: font.medium, fontSize: 15, lineHeight: 22, color: color.inkMuted },
  current: { fontFamily: font.bold, color: color.snuBlue },
  count: {
    minWidth: COUNT,
    height: COUNT,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
    fontFamily: font.bold,
    fontSize: 11,
    lineHeight: COUNT,
    textAlign: 'center',
    color: color.inkMuted,
    backgroundColor: color.surfaceSunken,
  },
  countCurrent: { color: color.snuBlue, backgroundColor: color.blue100 },
  countAlert: { color: color.onPrimary, backgroundColor: color.danger },
  underline: { position: 'absolute', right: 0, bottom: 0, left: 0, height: 3, backgroundColor: color.snuBlue },
});
