// AI-generated with Claude Opus 5.5, 2026-10-05 to 2026-10-06, prompted by AhnJinYoung, reviewed by Jaehyun0320 in #50
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './icon';
import { color, font, radius, shadow, size, text } from './tokens';

export interface BottomNavItem {
  icon: IconName;
  label: string;
  // A count on the icon. Zero shows nothing.
  badge?: number;
  // The one action in the middle of the bar: its icon is drawn in a round fill of the key colour, inside the bar,
  // and its name is not shown. It is a button and never the current destination.
  action?: boolean;
}

interface BottomNavProps {
  // Three to five items.
  items: readonly BottomNavItem[];
  // The index of the current item.
  active: number;
  onSelect?: (index: number) => void;
  // The line on top of the bar. A screen that draws its own edge above the bar, as the main screen does with a
  // shadow, passes false. Left out, the line is there and adds 1 to the bar's height.
  line?: boolean;
}

interface ItemProps {
  item: BottomNavItem;
  current: boolean;
  onPress: () => void;
}

// One destination: its icon in a pill, a count on it, and its name.
function Tab({ item: { icon, label, badge }, current, onPress }: ItemProps): ReactElement {
  const tint = current ? color.snuBlue : color.inkMuted;
  const hasBadge = badge !== undefined && badge > 0;
  return (
    <Pressable
      accessibilityLabel={hasBadge ? `${label}, 새 소식 ${badge}개` : label}
      accessibilityRole="tab"
      accessibilityState={{ selected: current }}
      onPress={onPress}
      style={styles.item}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.icon, pressed && styles.pressedIcon, current && styles.currentIcon]}>
            <Icon color={tint} name={icon} size={22} />
            {hasBadge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.label, { color: tint }, current && styles.currentLabel]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

// The action in the middle, as the main screen's frame draws it: the item's icon in a round fill of the key colour,
// inside the bar. Its name is hidden and stays what a screen reader says. It does something and is never the
// current destination.
function Action({ item: { icon, label }, onPress }: Omit<ItemProps, 'current'>): ReactElement {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.item}>
      {({ pressed }) => (
        <View style={[styles.action, pressed && styles.actionPressed]}>
          <Icon color={color.onPrimary} name={icon} size={22} />
        </View>
      )}
    </Pressable>
  );
}

// The primary navigation at the bottom of every top-level screen. The owner adds the system's gesture inset below it
// and tells the toast how high it stands, with `useToastAbove`.
export function BottomNav({ items, active, onSelect, line = true }: BottomNavProps): ReactElement {
  return (
    <View accessibilityRole="tablist" style={[styles.nav, line && styles.lined]}>
      {items.map((item, index) => {
        const press = (): void => {
          onSelect?.(index);
        };
        return item.action === true ? (
          <Action item={item} key={item.label} onPress={press} />
        ) : (
          <Tab current={index === active} item={item} key={item.label} onPress={press} />
        );
      })}
    </View>
  );
}

const BADGE = 16;
// The round fill around the action's icon, as the `Main` frame draws it.
const ACTION = 44;

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    height: size.bottomNav,
    backgroundColor: color.surface,
  },
  // The line on top is added to the bar's height.
  lined: {
    height: size.bottomNav + 1,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 28,
    borderRadius: radius.full,
  },
  pressedIcon: { backgroundColor: color.blue50 },
  currentIcon: { backgroundColor: color.blue100 },
  action: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ACTION,
    height: ACTION,
    borderRadius: radius.full,
    backgroundColor: color.snuBlue,
    boxShadow: shadow.navAction,
  },
  actionPressed: { backgroundColor: color.snuBluePressed },
  label: { ...text.caption },
  currentLabel: { fontFamily: font.bold },
  badge: {
    position: 'absolute',
    top: -2,
    right: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: BADGE,
    height: BADGE,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    backgroundColor: color.danger,
  },
  // Smaller than any text style: the design system's own size for this count.
  badgeText: {
    fontFamily: font.bold,
    fontSize: 10,
    lineHeight: BADGE,
    color: color.onPrimary,
  },
});
