/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { radius } from '@/design-system';
import { useLoop } from '@/hooks/use-loop';
import { useMotionAllowed } from '@/hooks/use-reduce-motion';

// The frame's recording red, a little brighter than `danger`, so that a light reads as a light.
const RED = '#E53935';
const SIZE = 8;
// The frame blinks once in 1.6 seconds: dimmed half way, back by the end.
const BLINK_MS = 1600;
const DIM = 0.35;
const EASE = Easing.inOut(Easing.ease);

// The red light of a 파티 running now: beside "활성화 중" on a card and on the group's header. It blinks, and stays
// still while the phone asks apps to reduce motion.
export function LiveDot(): ReactElement {
  const round = useLoop(useMotionAllowed(), BLINK_MS, EASE);
  const opacity = round.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, DIM, 1] });
  return <Animated.View style={[styles.dot, { opacity }]} />;
}

const styles = StyleSheet.create({
  dot: { width: SIZE, height: SIZE, borderRadius: radius.full, backgroundColor: RED },
});
