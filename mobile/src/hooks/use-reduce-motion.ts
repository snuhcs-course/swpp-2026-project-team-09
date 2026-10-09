/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Whether the phone asks apps to reduce motion, and null until the phone has answered.
export function useReduceMotionSetting(): boolean | null {
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setReduceMotion(enabled);
      }
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return (): void => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return reduceMotion;
}

// Whether the phone asks apps to reduce motion. Animations stay still while it does.
export function useReduceMotion(): boolean {
  return useReduceMotionSetting() === true;
}

// Whether a motion that starts by itself may run: only once the phone has said that it does not ask for less.
export function useMotionAllowed(): boolean {
  return useReduceMotionSetting() === false;
}
