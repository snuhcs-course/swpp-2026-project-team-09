/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { use, useEffect, useSyncExternalStore } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { tabBarHeight } from './layout';

// Who asks the tab bar to give way on the main screen while it is in front: the answer frame's card, which takes the
// screen's bottom, and the friend panel. It gives way while any of them asks, so that one leaving does not bring it
// back under another.
const hiders = new Set<symbol>();
const watchers = new Set<() => void>();

function watch(watcher: () => void): () => void {
  watchers.add(watcher);
  return (): void => {
    watchers.delete(watcher);
  };
}

function isHidden(): boolean {
  return hiders.size > 0;
}

function tell(): void {
  for (const watcher of watchers) {
    watcher();
  }
}

// For the main screen: the tab bar gives way while `hide`, and comes back when this asker is gone, unless another
// still asks.
export function useHideTabBarOnMain(hide: boolean): void {
  useEffect(() => {
    if (!hide) {
      return undefined;
    }
    const hider = Symbol('tab bar hider');
    hiders.add(hider);
    tell();
    return (): void => {
      hiders.delete(hider);
      tell();
    };
  }, [hide]);
}

export function useTabBarHiddenOnMain(): boolean {
  return useSyncExternalStore(watch, isHidden);
}

// How much of the main screen's bottom the navigation covers: its whole height while it is shown, 0 while it gives
// way. The map lies under it, as high as the screen, so that its view keeps one size and the navigation giving way
// moves nothing on it; what the map draws at its bottom and fits into its view keeps clear of this much.
// Without a provider of the phone's own bar, as in a test of the map alone, that bar counts as 0.
export function useNavCoverOnMain(): number {
  const bottom = use(SafeAreaInsetsContext)?.bottom ?? 0;
  return useTabBarHiddenOnMain() ? 0 : tabBarHeight(bottom);
}
