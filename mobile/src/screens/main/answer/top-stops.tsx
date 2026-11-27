/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { color, Icon, radius, shadow } from '@/design-system';
import { listsTop } from '../layout';

// The top of an answer folds upward in stops, as the answer sheet steps below it (P01 ticket 22, the user's choice of
// 2026-11-27): 2, the steps card with the time card under it; 1, the steps card with a tab under its bottom centre, the
// time card wholly behind it; 0, one tab at the screen's top centre. The time card folds first, then the steps card;
// opening is the other way. An answer to one request has no steps card: its stops are 2 and 0. A press on a tab opens
// one stop, and a pull down a long way opens two; a fold is never undone by itself.
export type TopStop = 0 | 1 | 2;

export interface TopStops {
  stop: TopStop;
  setStop: (stop: TopStop) => void;
  // The steps card's height, kept from the last one laid out, so that the sheet's high edge at stop 1 stays where it
  // was while an answer loads.
  stepsHeight: number;
  setStepsHeight: (height: number) => void;
}

export function useTopStops(): TopStops {
  const [stop, setStop] = useState<TopStop>(2);
  const [stepsHeight, setStepsHeight] = useState(0);
  return useMemo(() => ({ stop, setStop, stepsHeight, setStepsHeight }), [stop, stepsHeight]);
}

// The tab's size, and the room it takes under what stands over it.
export const TAB = { width: 56, height: 24 } as const;

// A pull this far past one stop goes on to the next.
export const LONG_PULL = 72;

// Where a stop shows for the answer on screen: one request has no stop 1, and keeps a fold as the nearer folded stop.
export function shownStop(stop: TopStop, several: boolean): TopStop {
  return !several && stop === 1 ? 0 : stop;
}

// A press on the tab at `stop` opens one stop: for one request, the time card at once.
export function pressedTo(stop: TopStop, several: boolean): TopStop {
  if (stop === 2) {
    return 2;
  }
  return several && stop === 0 ? 1 : 2;
}

// A pull on the tab: down opens one stop, or two a long way; up at stop 1 folds the steps card too.
export function pulledTo(stop: TopStop, dy: number, several: boolean): TopStop {
  if (dy > 0) {
    if (stop === 0 && several && dy < LONG_PULL) {
      return 1;
    }
    return 2;
  }
  return 0;
}

// The fold a pull up on the time card's grip makes: to stop 1 under a steps card, or 0 a long way or with none.
export function foldedTo(several: boolean, long: boolean): TopStop {
  return several && !long ? 1 : 0;
}

// The room over the answer sheet's high edge, from the lists' top, that a stop leaves: none but the tab at 0, the
// steps card and its tab at 1, and at 2 what stands there today (`folded`, the folded time card's place or the bar of
// steps reaching lower).
export function topRoomOf(stop: TopStop, { stepsHeight, folded }: { stepsHeight: number; folded: number }): number {
  if (stop === 0) {
    return TAB.height;
  }
  if (stop === 1 && stepsHeight > 0) {
    return stepsHeight + TAB.height;
  }
  return folded;
}

// The arrow tab: a chevron, no words. A press opens, a pull down opens, a pull up folds (`pulledTo`).
export function FoldTab({
  top,
  onPress,
  onPull,
  testID,
}: {
  top: number;
  onPress: () => void;
  onPull: (dy: number) => void;
  testID: string;
}): ReactElement {
  const pull = Gesture.Pan()
    .withTestId(`${testID}-drag`)
    .activeOffsetY([-8, 8])
    .onEnd(({ translationY }) => {
      'worklet';
      scheduleOnRN(onPull, translationY);
    });
  return (
    <GestureDetector gesture={pull}>
      <Pressable
        accessibilityLabel="위쪽 카드 펴기"
        accessibilityRole="button"
        hitSlop={10}
        onPress={onPress}
        style={[styles.tab, { top }]}
        testID={testID}
      >
        <Icon color={color.inkMuted} name="chevronDown" size={18} />
      </Pressable>
    </GestureDetector>
  );
}

// The one tab left at the top's centre, in the lists' place, the top told as its height: a press opens one stop, a
// pull down one or two (`pressedTo`, `pulledTo`).
export function TopTab({
  stops,
  several,
  onHeight,
}: {
  stops: TopStops;
  several: boolean;
  onHeight?: (height: number) => void;
}): ReactElement {
  const { top } = useSafeAreaInsets();
  useEffect(() => {
    onHeight?.(TAB.height);
  }, [onHeight]);
  return (
    <FoldTab
      onPress={() => {
        stops.setStop(pressedTo(0, several));
      }}
      onPull={(dy) => {
        stops.setStop(pulledTo(0, dy, several));
      }}
      testID="top-tab"
      top={listsTop(top)}
    />
  );
}

const styles = StyleSheet.create({
  tab: {
    position: 'absolute',
    alignSelf: 'center',
    left: '50%',
    marginLeft: -TAB.width / 2,
    width: TAB.width,
    height: TAB.height,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
});
