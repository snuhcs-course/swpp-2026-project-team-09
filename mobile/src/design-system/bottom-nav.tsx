import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './icon';
import { color, font, halo, radius, size, text } from './tokens';

export interface BottomNavItem {
  icon: IconName;
  label: string;
  // A count on the icon. Zero shows nothing.
  badge?: number;
  // The one action in the middle of the bar, drawn as a round button that stands out of it.
  raised?: boolean;
}

interface BottomNavProps {
  // Three to five items.
  items: readonly BottomNavItem[];
  // The index of the current item.
  active: number;
  onSelect?: (index: number) => void;
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

// The action in the middle, as the main screen's frame draws it: a round button that stands out of the bar, with its
// name below. It does something and is never the current destination.
function RaisedAction({ item: { icon, label }, onPress }: Omit<ItemProps, 'current'>): ReactElement {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.item}>
      {({ pressed }) => (
        <>
          <View style={styles.icon} />
          <View style={[styles.raised, pressed && styles.raisedPressed]}>
            <Icon color={color.onPrimary} name={icon} size={24} />
          </View>
          <Text style={[styles.label, { color: color.inkMuted }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

// The primary navigation at the bottom of every top-level screen. The owner adds the system's gesture inset below it
// and tells the toast how high it stands, with `useToastAbove`.
export function BottomNav({ items, active, onSelect }: BottomNavProps): ReactElement {
  return (
    <View accessibilityRole="tablist" style={styles.nav}>
      {items.map((item, index) => {
        const press = (): void => {
          onSelect?.(index);
        };
        return item.raised === true ? (
          <RaisedAction item={item} key={item.label} onPress={press} />
        ) : (
          <Tab current={index === active} item={item} key={item.label} onPress={press} />
        );
      })}
    </View>
  );
}

const BADGE = 16;
// The round button is 52 inside a white border of 4, and its bottom is 30 above the bar's.
const RAISED = 60;
const RAISED_BOTTOM = 30;

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    // The line on top is added to the bar's height.
    height: size.bottomNav + 1,
    borderTopWidth: 1,
    borderTopColor: color.border,
    backgroundColor: color.surface,
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
  raised: {
    position: 'absolute',
    bottom: RAISED_BOTTOM,
    alignItems: 'center',
    justifyContent: 'center',
    width: RAISED,
    height: RAISED,
    borderRadius: radius.full,
    borderWidth: 4,
    borderColor: color.surface,
    backgroundColor: color.snuBlue,
    boxShadow: `0 6px 16px ${halo.raised}`,
  },
  raisedPressed: { backgroundColor: color.snuBluePressed },
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
