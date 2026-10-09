/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './icon';
import { color, font, radius, space } from './tokens';

interface RoundIconProps {
  icon: IconName;
  // The round's fill and the icon's colour: white on a kind's colour, or a colour on its tinted ground.
  fill: string;
  ink: string;
}

// An icon in a round of 40, at the start of a row in place of an Avatar.
export function RoundIcon({ icon, fill, ink }: RoundIconProps): ReactElement {
  return (
    <View style={[styles.round, { backgroundColor: fill }]}>
      <Icon color={ink} name={icon} size={18} />
    </View>
  );
}

interface ListRowProps {
  // An Avatar of 40 or a `RoundIcon`.
  leading: ReactNode;
  title: string;
  // Beside the title, smaller: a Friend's department.
  aside?: string;
  // Over the title in a kind's colour: "강의", "공개 파티".
  kicker?: { words: string; color: string };
  // One or two lines under the title.
  lines?: readonly string[];
  // At the end: a button, or a value with a chevron.
  trailing?: ReactNode;
  // A row of 72 with its title in 16, as a Quest's on the whole screen; otherwise 64 with lines and 56 without.
  large?: boolean;
  // Makes the whole row a button, read by this label.
  onPress?: () => void;
  label?: string;
}

type WordsProps = Pick<ListRowProps, 'title' | 'aside' | 'kicker' | 'lines' | 'large'>;

function Words({ title, aside, kicker, lines = [], large = false }: WordsProps): ReactElement {
  return (
    <View style={styles.words}>
      {kicker === undefined ? null : (
        <Text numberOfLines={1} style={[styles.kicker, { color: kicker.color }]}>
          {kicker.words}
        </Text>
      )}
      <View style={styles.titleLine}>
        <Text numberOfLines={1} style={large ? styles.titleLarge : styles.title}>
          {title}
        </Text>
        {aside === undefined ? null : (
          <Text numberOfLines={1} style={styles.aside}>
            {aside}
          </Text>
        )}
      </View>
      {lines.map((line) => (
        <Text key={line} numberOfLines={1} style={styles.line}>
          {line}
        </Text>
      ))}
    </View>
  );
}

// One row of a list: what it is at the start, its words, and what it offers at the end, over a line of 1.
export function ListRow({ leading, trailing, onPress, label, ...words }: ListRowProps): ReactElement {
  const minHeight = words.large === true ? 72 : (words.lines ?? []).length > 0 ? 64 : 56;
  const content = (
    <>
      {leading}
      <Words {...words} />
      {trailing}
    </>
  );
  if (onPress === undefined) {
    return <View style={[styles.row, { minHeight }]}>{content}</View>;
  }
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, { minHeight }, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

// A group's name over its rows: "공강 · 4", "오늘 · 10월 1일 (수)".
export function SectionHeader({ children }: { children: string }): ReactElement {
  return (
    <Text accessibilityRole="header" style={styles.header}>
      {children}
    </Text>
  );
}

const ROUND = 40;

const styles = StyleSheet.create({
  round: { alignItems: 'center', justifyContent: 'center', width: ROUND, height: ROUND, borderRadius: radius.full },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  pressed: { backgroundColor: color.surfaceSubtle },
  words: { flex: 1, gap: 1 },
  kicker: { fontFamily: font.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.11 },
  titleLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  title: { flexShrink: 1, fontFamily: font.semiBold, fontSize: 15, lineHeight: 22, color: color.ink },
  titleLarge: { flexShrink: 1, fontFamily: font.semiBold, fontSize: 16, lineHeight: 22, color: color.ink },
  aside: { flexShrink: 1, fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  line: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  header: {
    paddingTop: space[3],
    paddingBottom: space[1],
    fontFamily: font.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: color.inkMuted,
  },
});
