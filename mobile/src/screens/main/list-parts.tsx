/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Animated, type Insets, Platform, Pressable, StyleSheet } from 'react-native';
import { color, Icon, radius, shadow } from '@/design-system';
import { LISTS, listWindow } from './layout';

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
      // The web reads the state from this one.
      aria-expanded={open}
      hitSlop={reachOf(pill)}
      onPress={onPress}
      style={({ pressed }) => [styles.collapse, pressed && styles.pressed, !open && styles.turned]}
    >
      <Icon color={color.ink} name="chevronUp" size={18} />
    </Pressable>
  );
}

interface RowWindowProps {
  rows: readonly ReactElement[];
  // How many rows the window shows: three, or fewer on a low screen (`listRows`).
  shown: number;
  // The side of the screen the list is at: the window and its rows start there.
  side: 'left' | 'right';
  testID?: string;
}

const STEP = LISTS.row + LISTS.rowGap;

// The frame's mask over the window, counted back from the window's end: solid until 58 before it, at 40% from 50 to
// 14 before it, nothing at the end. In the frame's window of 172 that is solid down to 114 and 40% from 122 to 158.
const MASK = { before: [0, 14, 50, 58], strength: [0, 0.4, 0.4, 1] } as const;

// How strongly the row at `index` is drawn while the list is scrolled by `scrolled`: what the mask has at the row's
// middle. So the rows above the window's last place are solid, the row in it is at 40%, and a row is nothing by the
// time its middle is at the window's end. As the list reaches its end the fade lifts, where nothing goes on.
function strengthAt(
  scrolled: Animated.Value,
  index: number,
  count: number,
  shown: number,
): Animated.AnimatedSubtraction<number> {
  // The scroll at which the row's middle is at the window's end.
  const atEnd = index * STEP + LISTS.row / 2 - listWindow(shown);
  const taken = scrolled.interpolate({
    inputRange: MASK.before.map((before) => atEnd + before),
    outputRange: MASK.strength.map((strength) => 1 - strength),
    extrapolate: 'clamp',
  });
  const end = (count - shown) * STEP;
  const goesOn = scrolled.interpolate({ inputRange: [end - STEP, end], outputRange: [1, 0], extrapolate: 'clamp' });
  return Animated.subtract(1, Animated.multiply(taken, goesOn));
}

// The window that a list's rows scroll in: `shown` rows high, or as high as fewer rows are. It snaps to the rows
// where the platform does (not on the web).
//
// Only the rows take a touch; everything else in the window lets it through to the map:
// - the window is as wide as its widest row and no wider than its column, and stands at the list's side;
// - the window, its content and the box around each row are `box-none`, so a touch beside a shorter row or between
//   two rows reaches the map;
// - a scroll view that is `box-none` does not scroll on Android (`ReactScrollView.onTouchEvent` refuses the touch),
//   so the window takes touches from the moment a touch starts on a row until that touch or its drag ends. A touch
//   that starts on a row scrolls the list; one that starts anywhere else never reaches the window.
//
// With more rows than it shows, a window of two rows or more fades towards its end. The frame fades with a mask,
// which React Native does not have; a gradient over the window would colour the map under it, so each row's own
// strength follows the scroll instead (`strengthAt`).
export function RowWindow({ rows, shown, side, testID }: RowWindowProps): ReactElement {
  const [scrolled] = useState(() => new Animated.Value(0));
  const [held, setHeld] = useState(false);
  const fades = rows.length > shown && shown > 1;
  const release = (): void => {
    setHeld(false);
  };
  return (
    <Animated.ScrollView
      contentContainerStyle={styles.rows}
      decelerationRate="fast"
      nestedScrollEnabled
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrolled } } }], {
        // The web has no native driver.
        useNativeDriver: Platform.OS !== 'web',
      })}
      onScrollEndDrag={release}
      onTouchEnd={release}
      onTouchStart={() => {
        setHeld(true);
      }}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      snapToInterval={STEP}
      style={[styles.window, styles[side], held ? styles.held : styles.through, { maxHeight: listWindow(shown) }]}
      testID={testID}
    >
      {rows.map((row, index) => (
        <Animated.View
          key={row.key}
          style={[styles.through, { opacity: fades ? strengthAt(scrolled, index, rows.length, shown) : 1 }]}
        >
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
  // As wide as its widest row, and no wider than its column.
  window: { flexGrow: 0, maxWidth: '100%' },
  left: { alignSelf: 'flex-start' },
  right: { alignSelf: 'flex-end' },
  through: { pointerEvents: 'box-none' },
  held: { pointerEvents: 'auto' },
  rows: { gap: LISTS.rowGap, pointerEvents: 'box-none' },
});
