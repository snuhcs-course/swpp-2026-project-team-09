import { type ReactElement, useState } from 'react';
import { Animated, type Insets, Platform, Pressable, StyleSheet } from 'react-native';
import { color, Icon, radius, shadow } from '@/design-system';
import { LIST_WINDOW, LISTS } from './layout';

// What the friend list and the Quest list of the main screen share: the round button that collapses a list, and the
// window its rows scroll in.

interface CollapseButtonProps {
  // "친구 목록" or "퀘스트 목록": the button is read as "… 접기" while the list is open and "… 펼치기" while it is not.
  list: string;
  open: boolean;
  // The side of the button where its pill is. The touch area grows away from it.
  pill: 'left' | 'right';
  onPress: () => void;
}

// The frame's button is 32. Its touch area is 48 high and 48 wide: 8 above and below, where nothing is, 13 away
// from the pill, and 3 towards it, half of the room between the two, so that it never reaches the pill.
const BUTTON = 32;
const REACH = { away: 13, towards: 3, vertical: 8 } as const;

function reachOf(pill: 'left' | 'right'): Insets {
  return {
    top: REACH.vertical,
    bottom: REACH.vertical,
    left: pill === 'left' ? REACH.towards : REACH.away,
    right: pill === 'right' ? REACH.towards : REACH.away,
  };
}

// The round button beside a list's pill. Its arrow points up while the list is open and down while it is collapsed.
export function CollapseButton({ list, open, pill, onPress }: CollapseButtonProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={`${list} ${open ? '접기' : '펼치기'}`}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      hitSlop={reachOf(pill)}
      onPress={onPress}
      style={({ pressed }) => [styles.collapse, pressed && styles.pressed, !open && styles.turned]}
    >
      <Icon color={color.ink} name="chevronUp" size={18} />
    </Pressable>
  );
}

const STEP = LISTS.row + LISTS.rowGap;
// The frame's mask draws the third row of the window at 40%.
const FADED = 0.4;

// How strongly the row at `index` is drawn while the list is scrolled by `scrolled`: the rows in the window's first
// two places are solid and the one in its third place is faded, which says that the list goes on. The last row
// becomes solid as the list reaches its end, where nothing goes on.
function strengthAt(scrolled: Animated.Value, index: number, count: number): Animated.AnimatedInterpolation<number> {
  const third = (index - (LISTS.rows - 1)) * STEP;
  const from = index === count - 1 ? third - STEP : third;
  return scrolled.interpolate({ inputRange: [from, from + STEP], outputRange: [FADED, 1], extrapolate: 'clamp' });
}

// The window that a list's rows scroll in: three rows high, or as high as fewer rows are. It snaps to the rows.
// With more rows than it shows, the row in its third place is faded. The frame fades with a mask over the window,
// which React Native does not have; a gradient over the window would colour the map under it, so each row's own
// strength follows the scroll instead.
export function RowWindow({ rows, testID }: { rows: readonly ReactElement[]; testID?: string }): ReactElement {
  const [scrolled] = useState(() => new Animated.Value(0));
  const fades = rows.length > LISTS.rows;
  return (
    <Animated.ScrollView
      contentContainerStyle={styles.rows}
      decelerationRate="fast"
      nestedScrollEnabled
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrolled } } }], {
        // The web has no native driver.
        useNativeDriver: Platform.OS !== 'web',
      })}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      snapToInterval={STEP}
      style={styles.window}
      testID={testID}
    >
      {rows.map((row, index) => (
        <Animated.View key={row.key} style={fades ? { opacity: strengthAt(scrolled, index, rows.length) } : null}>
          {row}
        </Animated.View>
      ))}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  collapse: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BUTTON,
    height: BUTTON,
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  pressed: { backgroundColor: color.surfaceSunken },
  turned: { transform: [{ rotate: '180deg' }] },
  window: { flexGrow: 0, maxHeight: LIST_WINDOW },
  rows: { gap: LISTS.rowGap },
});
