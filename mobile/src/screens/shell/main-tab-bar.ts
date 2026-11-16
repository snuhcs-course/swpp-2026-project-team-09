/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useSyncExternalStore } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBarHeight } from './layout';

// Whether the main screen asks the tab bar to give way while it is in front: the answer frame's card takes the
// screen's bottom.
let hidden = false;
const watchers = new Set<() => void>();

function watch(watcher: () => void): () => void {
  watchers.add(watcher);
  return (): void => {
    watchers.delete(watcher);
  };
}

function isHidden(): boolean {
  return hidden;
}

function setHidden(next: boolean): void {
  hidden = next;
  for (const watcher of watchers) {
    watcher();
  }
}

// For the main screen: the tab bar gives way while `hide`, and comes back when the screen is gone.
export function useHideTabBarOnMain(hide: boolean): void {
  useEffect(() => {
    setHidden(hide);
    return (): void => {
      setHidden(false);
    };
  }, [hide]);
}

export function useTabBarHiddenOnMain(): boolean {
  return useSyncExternalStore(watch, isHidden);
}

// How much of the main screen's bottom the navigation covers: its whole height while it is shown, 0 while it gives
// way. The map lies under it, as high as the screen, so that its view keeps one size and the navigation giving way
// moves nothing on it; what the map draws at its bottom and fits into its view keeps clear of this much.
export function useNavCoverOnMain(): number {
  const { bottom } = useSafeAreaInsets();
  return useTabBarHiddenOnMain() ? 0 : tabBarHeight(bottom);
}
