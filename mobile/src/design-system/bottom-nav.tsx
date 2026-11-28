/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './icon';
import { color, font, radius, shadow, size, text } from './tokens';

export interface BottomNavItem {
  icon: IconName;
  label: string;
  // A count on the icon. Zero shows nothing; above nine it reads "9+".
  badge?: number;
  // What the count counts, for a screen reader: "답할 것" reads "오늘, 답할 것 3개". "새 소식" when left out.
  badgeWords?: string;
  // The round tab in the middle of the bar (A04 ticket 09): its icon in a circle, inside the bar, and its name not
  // shown. Filled with the key colour while it is the current tab and `raised`, else white with a ring of the key
  // colour.
  round?: boolean;
  // For the round tab: whether what its own screen raises is up. Said as expanded or collapsed while it is current.
  raised?: boolean;
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

function hasCount(badge: number | undefined): badge is number {
  return badge !== undefined && badge > 0;
}

function nameOf({ label, badge, badgeWords = '새 소식' }: BottomNavItem): string {
  return hasCount(badge) ? `${label}, ${badgeWords} ${badge}개` : label;
}

// A count as drawn: "9+" above nine.
function countWords(badge: number): string {
  return badge > 9 ? '9+' : String(badge);
}

function Count({ badge }: { badge: number }): ReactElement {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{countWords(badge)}</Text>
    </View>
  );
}

// One destination: its icon in a pill, a count on it, and its name.
function Tab({ item, current, onPress }: ItemProps): ReactElement {
  const { icon, label, badge } = item;
  const tint = current ? color.snuBlue : color.inkMuted;
  return (
    <Pressable
      accessibilityLabel={nameOf(item)}
      accessibilityRole="tab"
      accessibilityState={{ selected: current }}
      onPress={onPress}
      style={styles.item}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.icon, pressed && styles.pressedIcon, current && styles.currentIcon]}>
            <Icon color={tint} name={icon} size={22} />
            {hasCount(badge) ? <Count badge={badge} /> : null}
          </View>
          <Text style={[styles.label, { color: tint }, current && styles.currentLabel]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

// The round tab in the middle, as the proposal's 권장 boards draw it: filled navy with a white icon while current and
// raised, else white with a navy ring and icon, and the selected tab's light ring around it while current. Its count is
// a small navy one on its top right edge (A04 ticket 12). Its name is hidden and stays what a screen reader says.
function RoundTab({ item, current, onPress }: ItemProps): ReactElement {
  const filled = current && item.raised === true;
  return (
    <Pressable
      accessibilityLabel={nameOf(item)}
      accessibilityRole="tab"
      accessibilityState={current ? { selected: true, expanded: item.raised === true } : { selected: false }}
      onPress={onPress}
      style={styles.item}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.round,
            filled ? styles.roundFilled : styles.roundOutlined,
            current && (filled ? styles.roundCurrentFilled : styles.roundCurrent),
            pressed && (filled ? styles.roundFilledPressed : styles.roundOutlinedPressed),
          ]}
          testID="bottom-nav-round"
        >
          <Icon color={filled ? color.onPrimary : color.snuBlue} name={item.icon} size={ROUND_ICON} />
          {hasCount(item.badge) ? (
            <View style={styles.roundCount} testID="bottom-nav-round-count">
              <Text style={styles.roundCountText}>{countWords(item.badge)}</Text>
            </View>
          ) : null}
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
        return item.round === true ? (
          <RoundTab current={index === active} item={item} key={item.label} onPress={press} />
        ) : (
          <Tab current={index === active} item={item} key={item.label} onPress={press} />
        );
      })}
    </View>
  );
}

const BADGE = 16;
// The round tab, inside the bar's 64 with its light ring of 4 around it; the boards draw 60 in a bar of 70.
const ROUND = 56;
const ROUND_ICON = 28;
const ROUND_RING = 4;
// The round tab's count: 20 with its ring of 2, a little smaller than the boards' 22, to sit inside the bar.
const ROUND_COUNT = 20;

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
  round: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ROUND,
    height: ROUND,
    borderRadius: radius.full,
  },
  roundFilled: { backgroundColor: color.snuBlue, boxShadow: shadow.navAction },
  roundOutlined: {
    borderWidth: 3,
    borderColor: color.snuBlue,
    backgroundColor: color.surface,
    boxShadow: shadow.navRound,
  },
  roundCurrentFilled: { boxShadow: `0 0 0 ${ROUND_RING}px ${color.blue100}, ${shadow.navAction}` },
  roundCurrent: { boxShadow: `0 0 0 ${ROUND_RING}px ${color.blue100}` },
  roundFilledPressed: { backgroundColor: color.snuBluePressed },
  roundCount: {
    position: 'absolute',
    top: -ROUND_COUNT / 3,
    right: -ROUND_COUNT / 3,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: ROUND_COUNT,
    height: ROUND_COUNT,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: color.snuBlue,
    backgroundColor: color.surface,
  },
  roundCountText: { fontFamily: font.bold, fontSize: 11, lineHeight: 14, color: color.snuBlue },
  roundOutlinedPressed: { backgroundColor: color.blue50 },
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
