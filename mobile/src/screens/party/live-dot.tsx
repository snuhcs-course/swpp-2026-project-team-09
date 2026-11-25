/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type ReactElement, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { radius } from '@/design-system';
import { useMotionAllowed } from '@/hooks/use-reduce-motion';

// The frame's recording red, a little brighter than `danger`, so that a light reads as a light.
const RED = '#E53935';
const SIZE = 8;
// The frame blinks once in 1.6 seconds: dimmed half way, back by the end.
const HALF_MS = 800;
const DIM = 0.35;

// The red light of a 파티 running now: beside "활성화 중" on a card and on the group's header. It blinks, and stays
// still while the phone asks apps to reduce motion.
export function LiveDot(): ReactElement {
  const moving = useMotionAllowed();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const step = (toValue: number): Animated.CompositeAnimation =>
      Animated.timing(opacity, {
        toValue,
        duration: HALF_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      });
    const blink = moving ? Animated.loop(Animated.sequence([step(DIM), step(1)])) : null;
    if (blink === null) {
      opacity.setValue(1);
    } else {
      blink.start();
    }
    return (): void => {
      blink?.stop();
    };
  }, [moving, opacity]);
  return <Animated.View style={[styles.dot, { opacity }]} />;
}

const styles = StyleSheet.create({
  dot: { width: SIZE, height: SIZE, borderRadius: radius.full, backgroundColor: RED },
});
