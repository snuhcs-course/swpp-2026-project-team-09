/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useCallback, useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import Reanimated, { type SharedValue, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { radius } from '@/design-system';
import { useReduceMotionSetting } from '@/hooks/use-reduce-motion';
import { ANSWER_TOP } from '../layout';
import { SETTLE } from './card-run';
import { barTop } from './time-bar';
import { gripLanding, STRIP_SLOP, TUCK_STRIP } from './time-card-grip';
import { CARD_FACE, GripLine } from './time-card-strip';
import { restingLift, type TopStop, type TopStops } from './top-stops';

// A drag on the strip moves the bar's lift with the finger, between its place and the stage's top; a let-go settles at
// the stop a fling points to, or the nearer.
function useStripPan(lift: SharedValue<number>, stepsBottom: number, go: (to: TopStop) => void): PanGesture {
  const from = useSharedValue(0);
  return Gesture.Pan()
    .withTestId('steps-strip-drag')
    .activeOffsetY([-8, 8])
    .hitSlop(STRIP_SLOP)
    .onStart(() => {
      'worklet';
      from.value = lift.value;
    })
    .onUpdate(({ translationY }) => {
      'worklet';
      lift.value = Math.min(0, Math.max(-stepsBottom, from.value + translationY));
    })
    .onEnd(({ velocityY }) => {
      'worklet';
      scheduleOnRN(go, gripLanding(lift.value, velocityY, [-stepsBottom, 0]) === 0 ? 0 : 1);
    });
}

// The lift goes to its stop's resting place whenever the stop or the steps card's bottom changes: when the strip comes,
// after a time card unmounted mid-settle, or for a follow-up whose steps card lays out at another height (#686's
// review). A let-go at the stop it stood at goes back there itself, as no stop changes then.
function useStripLift({ lift, stop, setStop }: TopStops, stepsBottom: number): (to: TopStop) => void {
  const reduce = useReduceMotionSetting() !== false;
  const settle = useCallback(
    (at: number): void => {
      lift.value = reduce ? at : withSpring(at, SETTLE);
    },
    [lift, reduce],
  );
  useEffect(() => {
    settle(restingLift(stop, stepsBottom));
  }, [settle, stop, stepsBottom]);
  return (to: TopStop): void => {
    if (to === stop) {
      settle(restingLift(to, stepsBottom));
    } else {
      setStop(to);
    }
  };
}

// The grip strip under the bar of several requests while the step shown has no time card, a seat or a room (P01 ticket
// 22): it stands where the time card's own strip would, at the card's width and corners, its top behind the bar's
// rounded bottom, so that the top folds the same way on every step. A pull up takes the bar up with it until the strip
// alone is left at the stage's top (stop 0); a press or a pull down there brings the bar back (stop 1). Below that it
// opens nothing: there is no time card.
export function StepsStrip({ stops }: { stops: TopStops }): ReactElement {
  const { top } = useSafeAreaInsets();
  const { lift, stop, stepsHeight } = stops;
  const stepsBottom = barTop(top) + stepsHeight;
  const go = useStripLift(stops, stepsBottom);
  const pan = useStripPan(lift, stepsBottom, go);
  const moved = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  const rested = { transform: [{ translateY: restingLift(stop, stepsBottom) }] };
  return (
    <GestureDetector gesture={pan}>
      <Reanimated.View style={[styles.card, { top: stepsBottom - radius.xl }, moved, rested]} testID="steps-strip">
        <Pressable
          accessibilityActions={[
            stop === 0 ? { name: 'untuck', label: '단계 카드 펴기' } : { name: 'tuck', label: '단계 카드 접기' },
          ]}
          accessibilityLabel={`단계 카드 ${stop === 0 ? '펼치기' : '접기'}`}
          accessibilityRole="button"
          hitSlop={STRIP_SLOP}
          onAccessibilityAction={({ nativeEvent }) => {
            go(nativeEvent.actionName === 'untuck' ? 1 : 0);
          }}
          onPress={() => {
            if (stop === 0) {
              go(1);
            }
          }}
          style={styles.strip}
          testID="steps-strip-grip"
        >
          <GripLine />
        </Pressable>
      </Reanimated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  // The time card's strip: its width, its bottom corners, its 20 high under the bar; the part above behind the bar.
  card: {
    ...CARD_FACE,
    position: 'absolute',
    right: ANSWER_TOP.side,
    left: ANSWER_TOP.side,
    height: radius.xl + TUCK_STRIP,
    justifyContent: 'flex-end',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  strip: { height: TUCK_STRIP, alignItems: 'center', justifyContent: 'center' },
});
