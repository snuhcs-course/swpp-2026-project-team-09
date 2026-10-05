import { useEffect, useRef } from 'react';
import { Animated, type EasingFunction, Platform } from 'react-native';

// A value that runs from 0 to 1 again and again while `moving` holds, and stays at 0 while it does not. For a motion
// that starts by itself: give it `useMotionAllowed()`.
export function useLoop(moving: boolean, duration: number, easing: EasingFunction): Animated.Value {
  const round = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(round, { toValue: 1, duration, easing, useNativeDriver: Platform.OS !== 'web' }),
    );
    if (moving) {
      loop.start();
    }
    return (): void => {
      loop.stop();
      round.setValue(0);
    };
  }, [moving, duration, easing, round]);
  return round;
}
