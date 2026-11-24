/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useMemo, useState } from 'react';
import type { AccessibilityActionInfo, ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { Gesture, type PanGesture } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useReduceMotionSetting } from '@/hooks/use-reduce-motion';
import { CARRY_S, FLING_SPEED } from './card-levels';
import { SETTLE } from './card-run';

// The time card tucked away (P04 ticket 61, boards k1–k4): pushed up by its grip it slides up as it is, nothing laid out
// again or reworded, until only a thin strip with the grip shows under the status bar; pulled down it comes back. Only
// the grip takes the drag, with a touch area about 48 points high; the band keeps its handles. The bottom card's high
// step stays under the card's place as it stands by default, tucked or not.

// What of the card stays in sight tucked: the grip and a little room around it.
export const TUCK_STRIP = 20;
// The grip's touch area, about 48 points high around the grip, and a little wider than it.
const GRIP_SLOP = { top: 16, bottom: 16, left: 8, right: 8 };
// A drag starts past this many points, so that a press stays a press.
const PAN_STARTS = 8;

export const TUCK_LABEL = '시간 카드 접기';
export const UNTUCK_LABEL = '시간 카드 펴기';

interface TuckInput {
  // The card's laid-out height and its top, from the stage's top, which is under the status bar.
  height: number;
  top: number;
}

export interface Tuck {
  tucked: boolean;
  pan: PanGesture;
  // The card's translation, which the UI thread moves, and after it where the card rests, which React holds so that a
  // commit of React's lays the right place again (as `useRun` does for the answer sheet).
  moved: ReturnType<typeof useMoved>;
  rested: ViewStyle;
  // A screen reader's steps on the grip.
  actions: AccessibilityActionInfo[];
  onAction: (name: string) => void;
}

function clamp(value: number, low: number, high: number): number {
  'worklet';
  return Math.min(high, Math.max(low, value));
}

// The grip's drag: the card follows the finger between its place and tucked, and a let-go settles at the side a fling
// points to, or the nearer one.
function useTuckPan(
  tuck: SharedValue<number>,
  reach: number,
  settleAt: (up: boolean, velocity?: number) => void,
): PanGesture {
  const from = useSharedValue(0);
  return Gesture.Pan()
    .withTestId('time-card-grip-drag')
    .activeOffsetY([-PAN_STARTS, PAN_STARTS])
    .hitSlop(GRIP_SLOP)
    .onStart(() => {
      'worklet';
      from.value = tuck.value;
    })
    .onUpdate(({ translationY }) => {
      'worklet';
      tuck.value = clamp(from.value + translationY, -reach, 0);
    })
    .onEnd(({ velocityY }) => {
      'worklet';
      const fling = Math.abs(velocityY) > FLING_SPEED;
      const up = fling ? velocityY < 0 : tuck.value + velocityY * CARRY_S < -reach / 2;
      scheduleOnRN(settleAt, up, velocityY);
    });
}

function useMoved(tuck: SharedValue<number>): ReturnType<typeof useAnimatedStyle<ViewStyle>> {
  return useAnimatedStyle<ViewStyle>(() => ({ transform: [{ translateY: tuck.value }] }));
}

export function useTuck({ height, top }: TuckInput): Tuck {
  const [tucked, setTucked] = useState(false);
  const reduce = useReduceMotionSetting() !== false;
  // How far up the card goes: until its last TUCK_STRIP points stand at the stage's top, under the status bar.
  const reach = Math.max(0, top + height - TUCK_STRIP);
  const tuck = useSharedValue(0);
  const settleAt = useCallback(
    (up: boolean, velocity = 0): void => {
      const to = up ? -reach : 0;
      if (reduce) {
        tuck.value = to;
        setTucked(up);
        return;
      }
      tuck.value = withSpring(to, { ...SETTLE, velocity }, (finished) => {
        'worklet';
        if (finished === true) {
          scheduleOnRN(setTucked, up);
        }
      });
    },
    [reach, reduce, tuck],
  );
  const pan = useTuckPan(tuck, reach, settleAt);
  const moved = useMoved(tuck);
  const rested = useMemo(() => ({ transform: [{ translateY: tucked ? -reach : 0 }] }), [tucked, reach]);
  return {
    tucked,
    pan,
    moved,
    rested,
    actions: [tucked ? { name: 'untuck', label: UNTUCK_LABEL } : { name: 'tuck', label: TUCK_LABEL }],
    onAction: (name: string): void => {
      if (name === 'tuck' || name === 'untuck') {
        settleAt(name === 'tuck');
      }
    },
  };
}
