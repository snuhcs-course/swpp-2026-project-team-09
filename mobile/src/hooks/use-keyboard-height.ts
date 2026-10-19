/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-19  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// iOS tells of the keyboard before it moves, so what gives way to it moves with it; Android only once it is up.
const SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

// How high the phone's keyboard reaches above the bottom of the screen, 0 while it is down. Android counts its
// height from the top of the phone's own bar (`ReactRootView`: the keyboard's inset less the system bars'), iOS from
// the bottom of the screen, so on Android the phone's own bar, `inset`, is added back. The web tells nothing of it
// and stays at 0.
export function useKeyboardHeight(inset = 0): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const came = Keyboard.addListener(SHOW, ({ endCoordinates }) => {
      setHeight(endCoordinates.height);
    });
    const left = Keyboard.addListener(HIDE, () => {
      setHeight(0);
    });
    return (): void => {
      came.remove();
      left.remove();
    };
  }, []);
  if (height === 0) {
    return 0;
  }
  return Platform.OS === 'android' ? height + inset : height;
}

// Whether the phone's keyboard is up.
export function useKeyboardShown(): boolean {
  return useKeyboardHeight() > 0;
}
