// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { useEffect } from 'react';
import { BackHandler } from 'react-native';

// How Android's back button closes what leaves the screen behind it in view: an open card on the map, a side panel
// or a bottom sheet. While `open`, the press closes it and goes no further; the latest to open is closed first, and
// with nothing open the press goes on to the navigation. A part of a tab that stays mounted behind another passes
// `open` only while its tab is in front. A screen above the tabs is the stack's, and a Dialog is closed by its Modal.
export function useBackToClose(open: boolean, close: () => void): void {
  useEffect(() => {
    const back = open
      ? BackHandler.addEventListener('hardwareBackPress', () => {
          close();
          return true;
        })
      : null;
    return (): void => {
      back?.remove();
    };
  }, [open, close]);
}
