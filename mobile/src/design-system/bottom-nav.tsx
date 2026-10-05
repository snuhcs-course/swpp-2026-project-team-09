import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './icon';
import { color, font, radius, size, text } from './tokens';

export interface BottomNavItem {
  icon: IconName;
  label: string;
  // A count on the icon. Zero shows nothing.
  badge?: number;
}

interface BottomNavProps {
  // Three to five items.
  items: readonly BottomNavItem[];
  // The index of the current item.
  active: number;
  onSelect?: (index: number) => void;
}

// The primary navigation at the bottom of every top-level screen. The owner adds the system's gesture inset below it.
export function BottomNav({ items, active, onSelect }: BottomNavProps): ReactElement {
  return (
    <View accessibilityRole="tablist" style={styles.nav}>
      {items.map(({ icon, label, badge }, index) => {
        const current = index === active;
        const tint = current ? color.snuBlue : color.inkMuted;
        const hasBadge = badge !== undefined && badge > 0;
        return (
          <Pressable
            accessibilityLabel={hasBadge ? `${label}, 새 소식 ${badge}개` : label}
            accessibilityRole="tab"
            accessibilityState={{ selected: current }}
            key={label}
            onPress={() => onSelect?.(index)}
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
      })}
    </View>
  );
}

const BADGE = 16;

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
