import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Whether the phone asks apps to reduce motion. Animations stay still while it does.
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);
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
