/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type RefObject, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import { color, radius, space } from '@/design-system';
import { useReduceMotion } from '@/hooks/use-reduce-motion';

const RAISE_LABEL = '답 크게 보기';

// A drag on the handle starts past this many points, so that a press stays a press.
const PAN_STARTS = 8;
// How far a fling carries the let-go point, in seconds of its speed.
const FLING_S = 0.15;
const SETTLE_MS = 180;

// The answer card's two heights, lowered and raised.
export interface Raising {
  raised: boolean;
  setRaised: (raised: boolean) => void;
}

// The handle's drag between the two heights. `content` is the content's height while it is dragged or settling, null
// otherwise.
interface Drag {
  content: Animated.Value | null;
  onContentLayout: (height: number) => void;
  handle: ReactElement;
}

// The content's height as laid out, the lowered height, and the height a drag started from.
interface Heights {
  shown: RefObject<number>;
  lowered: RefObject<number>;
  from: RefObject<number>;
}

interface PanInput {
  heights: Heights;
  content: Animated.Value;
  raisedHeight: number | null;
  onStart: () => void;
  onLetGo: (raised: boolean) => void;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

// A drag up or down on the handle: the content follows the finger between the two heights, and the let-go point, a
// fling carried on, picks the nearer height.
function panOf({ heights, content, raisedHeight, onStart, onLetGo }: PanInput): PanGesture {
  const { shown, lowered, from } = heights;
  return Gesture.Pan()
    .withTestId('answer-card-handle')
    .runOnJS(true)
    .enabled(raisedHeight !== null)
    .activeOffsetY([-PAN_STARTS, PAN_STARTS])
    .onStart(() => {
      from.current = shown.current;
      content.setValue(shown.current);
      onStart();
    })
    .onUpdate(({ translationY }) => {
      content.setValue(clamp(from.current - translationY, lowered.current, raisedHeight ?? from.current));
    })
    .onEnd(({ translationY, velocityY }) => {
      const at = from.current - translationY - velocityY * FLING_S;
      onLetGo(at > (lowered.current + (raisedHeight ?? 0)) / 2);
    });
}

function Handle({ pan, raising }: { pan: PanGesture; raising: Raising }): ReactElement {
  const { raised, setRaised } = raising;
  return (
    <GestureDetector gesture={pan}>
      <Pressable
        accessibilityLabel={RAISE_LABEL}
        accessibilityRole="button"
        accessibilityState={{ expanded: raised }}
        collapsable={false}
        onPress={() => {
          setRaised(!raised);
        }}
        style={styles.handle}
        testID="answer-card-handle"
      >
        <View style={styles.grip} />
      </Pressable>
    </GestureDetector>
  );
}

// `raisedHeight`: the content's height while raised, null until the stage is laid out.
export function useRaiseDrag(raising: Raising, raisedHeight: number | null): Drag {
  const reduceMotion = useReduceMotion();
  const [dragging, setDragging] = useState(false);
  const content = useRef(new Animated.Value(0)).current;
  const heights: Heights = { shown: useRef(0), lowered: useRef(0), from: useRef(0) };
  const settle = (raised: boolean): void => {
    const done = (): void => {
      raising.setRaised(raised);
      setDragging(false);
    };
    if (reduceMotion || raisedHeight === null) {
      done();
      return;
    }
    const toValue = raised ? raisedHeight : heights.lowered.current;
    Animated.timing(content, { toValue, duration: SETTLE_MS, useNativeDriver: false }).start(done);
  };
  const onStart = (): void => {
    setDragging(true);
  };
  const pan = panOf({ heights, content, raisedHeight, onStart, onLetGo: settle });
  return {
    content: dragging ? content : null,
    onContentLayout: (height) => {
      heights.shown.current = height;
      if (!raising.raised && !dragging) {
        heights.lowered.current = height;
      }
    },
    handle: <Handle pan={pan} raising={raising} />,
  };
}

const styles = StyleSheet.create({
  handle: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 1,
    alignItems: 'center',
    height: space[6],
    paddingTop: space[2],
  },
  grip: { width: 36, height: 4, borderRadius: radius.full, backgroundColor: color.border },
});
