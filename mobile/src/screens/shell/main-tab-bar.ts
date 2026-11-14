/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useSyncExternalStore } from 'react';

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
