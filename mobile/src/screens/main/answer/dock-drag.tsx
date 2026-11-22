/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, type PanGesture } from 'react-native-gesture-handler';
import { color, radius, space } from '@/design-system';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { GRIP_ROW, GRIP_SIDE } from './grip-row';
import { CLOSE_LABEL, FLING_S, RAISE_LABEL, type Raising, SETTLE_MS } from './raise-handle';

// The docked card's drag (P04 ticket 52): the whole card takes it, the input and the main button beside it being
// outside the card, and a press on a chip or a line stays a press. A drag down past half the card closes the answer and
// keeps the conversation, as "←" and Android's back do; a drag up raises the card.

// A drag starts past this many points up or down; sideways it gives way to the dock's row of chips.
const PAN_STARTS = 8;
const SIDEWAYS = 16;
// A drag up this far, a fling carried on, raises the card.
const RAISES_AT = 40;

export interface DockDrag {
  pan: PanGesture;
  // How far below its place the card is dragged.
  drop: Animated.Value;
  // Letting go now closes the answer.
  past: boolean;
  // The card's own height, which a drag down past half of closes it.
  onCardHeight: (height: number) => void;
}

function useSettleBack(drop: Animated.Value): () => void {
  const reduceMotion = useReduceMotion();
  return () => {
    if (reduceMotion) {
      drop.setValue(0);
      return;
    }
    Animated.timing(drop, { toValue: 0, duration: SETTLE_MS, useNativeDriver: false }).start();
  };
}

export function useDockDrag({ setRaised, close, layer = null, onPast }: Raising): DockDrag {
  const drop = useRef(new Animated.Value(0)).current;
  const height = useRef(0);
  const shown = useRef(false);
  const [past, setPast] = useState(false);
  const settleBack = useSettleBack(drop);
  // Past half the card the hint says the answer closes; with a layer to take away first, it does not.
  const tell = (next: boolean): void => {
    const now = next && layer === null && close !== undefined;
    if (shown.current !== now) {
      shown.current = now;
      setPast(now);
      onPast?.(now);
    }
  };
  const pan = Gesture.Pan()
    .withTestId('answer-dock-drag')
    .runOnJS(true)
    .activeOffsetY([-PAN_STARTS, PAN_STARTS])
    .failOffsetX([-SIDEWAYS, SIDEWAYS])
    .onUpdate(({ translationY }) => {
      const below = Math.max(0, translationY);
      drop.setValue(below);
      tell(below > height.current / 2);
    })
    .onEnd(({ translationY, velocityY }) => {
      const at = translationY + velocityY * FLING_S;
      tell(false);
      const down = layer ?? close;
      if (at > height.current / 2 && down !== undefined) {
        drop.setValue(0);
        down();
      } else if (-at > RAISES_AT) {
        drop.setValue(0);
        setRaised(true);
      } else {
        settleBack();
      }
    });
  return {
    pan,
    drop,
    past,
    onCardHeight: (next) => {
      height.current = next;
    },
  };
}

// The docked card's handle, the raised card's grip, in the middle of the handle's row: a press raises the card.
export function DockGrip({ raising }: { raising: Raising }): ReactElement {
  const { setRaised, close } = raising;
  return (
    <Pressable
      accessibilityActions={close === undefined ? undefined : [{ name: 'close', label: CLOSE_LABEL }]}
      accessibilityLabel={RAISE_LABEL}
      accessibilityRole="button"
      accessibilityState={{ expanded: false }}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === 'close') {
          close?.();
        }
      }}
      onPress={() => {
        setRaised(true);
      }}
      style={styles.handle}
      testID="answer-card-handle"
    >
      <View style={styles.grip} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  handle: {
    position: 'absolute',
    top: 0,
    right: GRIP_SIDE,
    left: GRIP_SIDE,
    alignItems: 'center',
    height: GRIP_ROW,
    paddingTop: space[2],
  },
  grip: { width: 36, height: 4, borderRadius: radius.full, backgroundColor: color.border },
});
