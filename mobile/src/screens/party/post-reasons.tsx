/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, Icon, radius, space } from '@/design-system';
import type { Reasons } from '@/features/party/finding';

function Reason({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <View style={styles.reason}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

// 파티 모집글's 추천 이유: whether the User's timetable leaves the time free, and the Friends among the members.
export function PostReasons({ reasons }: { reasons: Reasons }): ReactElement {
  return (
    <View accessibilityLabel="추천 이유" style={styles.reasons}>
      <View style={styles.head}>
        <Icon color={color.snuBlue} name="info" size={16} />
        <Text style={styles.title}>추천 이유</Text>
      </View>
      <Reason label="시간대">
        <Text style={styles.words}>{reasons.time}</Text>
      </Reason>
      {reasons.friend === null ? null : (
        <Reason label="친구">
          <Text style={styles.words}>{reasons.friend}</Text>
        </Reason>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  reasons: { gap: space[2], padding: space[4], borderRadius: radius.lg, backgroundColor: color.blue50 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: font.bold, fontSize: 14, lineHeight: 20, color: color.snuBlue },
  reason: { flexDirection: 'row', gap: space[3] },
  label: { width: 44, fontFamily: font.semiBold, fontSize: 13, lineHeight: 22, color: color.inkMuted },
  body: { flex: 1, justifyContent: 'center' },
  words: { fontFamily: font.regular, fontSize: 13, lineHeight: 22, color: color.ink },
});
