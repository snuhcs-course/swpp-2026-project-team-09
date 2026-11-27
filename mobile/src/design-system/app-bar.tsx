/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useInsets } from './insets';
import { Icon, type IconName } from './icon';
import { color, font, size, space } from './tokens';

interface IconButtonProps {
  icon: IconName;
  // What a screen reader says, such as "닫기".
  label: string;
  onPress: () => void;
}

// An icon alone in a touch area of 48, as on an app bar.
export function IconButton({ icon, label, onPress }: IconButtonProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Icon color={color.ink} name={icon} size={22} />
    </Pressable>
  );
}

// A tab's row, under the phone's inset: 50 high with 4 of it on top, so a title 32 high sits 7 above the line. A bar
// that takes a tab bar's place, such as 행사's search, takes this row too.
export const TAB_BAR_ROW = { height: 50, paddingTop: space[1] } as const;

const LEAVE = {
  back: { icon: 'chevronLeft', label: '뒤로' },
  close: { icon: 'x', label: '닫기' },
} as const;

interface AppBarProps {
  title: string;
  // A number after the title, such as the 12 of "퀘스트 12".
  count?: number;
  // A sub-screen's way out at the left: "뒤로" with a chevron for a screen pushed from the right, "닫기" with ✕ for
  // one that came up from the bottom or a panel. Without it the bar is a tab's.
  leave?: { kind: 'back' | 'close'; onPress: () => void };
  // At the right: buttons, such as "+ 만들기" or the bell.
  actions?: ReactNode;
  // The line under the bar. A panel whose header runs into its content has none.
  line?: boolean;
  // No white ground: the bar of a see-through panel, such as the glass friend panel.
  clear?: boolean;
}

// The bar at the top of a screen, under the phone's status bar, in the frames' two forms. A tab's has its title in
// 25/700 from 20 at the left; a sub-screen's has the way out in 48 at the left and its title in 20/700.
export function AppBar({ title, count, leave, actions, line = true, clear = false }: AppBarProps): ReactElement {
  const { top } = useInsets();
  return (
    <View style={[!clear && styles.bar, { paddingTop: top }, line && styles.lined]}>
      <View style={[styles.row, leave === undefined ? styles.tab : styles.sub]}>
        {leave === undefined ? null : (
          <IconButton icon={LEAVE[leave.kind].icon} label={LEAVE[leave.kind].label} onPress={leave.onPress} />
        )}
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={leave === undefined ? styles.tabTitle : styles.subTitle}
        >
          {title}
          {count === undefined ? null : <Text style={styles.count}>{` ${count}`}</Text>}
        </Text>
        {actions}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: color.surface },
  lined: { borderBottomWidth: 1, borderBottomColor: color.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  tab: { ...TAB_BAR_ROW, paddingRight: space[2], paddingLeft: space[5] },
  sub: { height: size.appBar, paddingRight: space[3], paddingLeft: space[1] },
  // Larger than `text.titleLg`, which other screens share (P06 ticket 17).
  tabTitle: { flex: 1, fontFamily: font.bold, fontSize: 25, lineHeight: 32, letterSpacing: -0.4, color: color.ink },
  // The frames' sub-screen title: between the two titles of the design system.
  subTitle: { flex: 1, fontFamily: font.bold, fontSize: 20, lineHeight: 28, letterSpacing: -0.3, color: color.ink },
  count: { fontFamily: font.medium, color: color.inkMuted },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: size.touchMin,
    height: size.touchMin,
    borderRadius: size.touchMin / 2,
  },
  pressed: { backgroundColor: color.surfaceSunken },
});
