// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { useReduceMotion } from '@/hooks/use-reduce-motion';

// The frames' slide of a panel or a sheet.
const SLIDE_MS = 280;

// How far a panel or a sheet is in, from 0 to 1, and whether it is drawn: it stays drawn while it slides out. Where
// the phone asks for less motion it appears and goes at once.
export function useSlide(open: boolean): { shown: boolean; progress: Animated.Value } {
  const reduceMotion = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(open ? 1 : 0));
  const [shown, setShown] = useState(open);
  if (open && !shown) {
    setShown(true);
  }
  useEffect(() => {
    const slide = reduceMotion
      ? null
      : Animated.timing(progress, {
          toValue: open ? 1 : 0,
          duration: SLIDE_MS,
          easing: Easing.out(Easing.ease),
          // The web has no native driver.
          useNativeDriver: Platform.OS !== 'web',
        });
    if (slide === null) {
      progress.setValue(open ? 1 : 0);
      if (!open) {
        setShown(false);
      }
    } else {
      slide.start(({ finished }) => {
        if (finished && !open) {
          setShown(false);
        }
      });
    }
    return (): void => {
      slide?.stop();
    };
  }, [open, reduceMotion, progress]);
  return { shown, progress };
}
