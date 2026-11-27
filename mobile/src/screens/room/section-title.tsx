/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, Icon, type IconName, space } from '@/design-system';

interface SectionTitleProps {
  icon: IconName;
  children: string;
  // Right after the words, such as 일정's ?.
  after?: ReactNode;
  // At the right end, such as `+ 추가` or 멤버's "3/4명".
  end?: ReactNode;
}

// The title of the room's lists, 일정, 신청, 멤버 and 초대 중: an icon on a light navy tile, then the words.
export function SectionTitle({ icon, children, after, end }: SectionTitleProps): ReactElement {
  return (
    <View style={styles.title}>
      <View style={styles.tile}>
        <Icon color={color.snuBlue} name={icon} size={16} testID={`section-icon-${icon}`} />
      </View>
      <Text accessibilityRole="header" style={styles.words}>
        {children}
      </Text>
      {after}
      <View style={styles.grow} />
      {end}
    </View>
  );
}

const TILE = 28;

const styles = StyleSheet.create({
  title: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 36 },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    width: TILE,
    height: TILE,
    borderRadius: 8,
    backgroundColor: color.blue50,
  },
  words: { fontFamily: font.semiBold, fontSize: 18, lineHeight: 26, color: color.ink },
  grow: { flex: 1 },
});
