/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useLoop } from '@/hooks/use-loop';
import { useMotionAllowed } from '@/hooks/use-reduce-motion';
import { color, space } from './tokens';

const DOT = 8;
const ROUND_MS = 1200;
const DIM = 0.3;

interface Pulse {
  key: string;
  inputRange: number[];
  outputRange: number[];
}

// Each dot is brightest in its own third of the round.
const PULSES: readonly Pulse[] = [
  { key: 'first', inputRange: [0, 1 / 6, 1 / 3, 1], outputRange: [DIM, 1, DIM, DIM] },
  { key: 'second', inputRange: [0, 1 / 3, 1 / 2, 2 / 3, 1], outputRange: [DIM, DIM, 1, DIM, DIM] },
  { key: 'third', inputRange: [0, 2 / 3, 5 / 6, 1], outputRange: [DIM, DIM, 1, DIM] },
];

// Three dots that pulse in turn while something is on its way, still while the phone asks for less motion. A screen
// reader reads `label`, the words they stand for.
export function WaitingDots({ label, testID }: { label: string; testID?: string }): ReactElement {
  const moving = useMotionAllowed();
  const round = useLoop(moving, ROUND_MS, Easing.linear);
  return (
    <View accessibilityLabel={label} accessible style={styles.dots} testID={testID}>
      {PULSES.map(({ key, inputRange, outputRange }) => (
        <Animated.View
          key={key}
          style={[styles.dot, moving ? { opacity: round.interpolate({ inputRange, outputRange }) } : null]}
          testID="waiting-dot"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', alignItems: 'center', gap: space[1], height: DOT * 3 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: color.inkMuted },
});
