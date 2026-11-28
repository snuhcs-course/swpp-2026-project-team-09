/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useEffect, useSyncExternalStore } from 'react';
import { useHideTabBarOnMain } from '../shell/main-tab-bar';

// What lies on glass over the main screen's map, the friend panel and the Quest list on the whole screen: while one
// does, what floats over the map and the tab bar give way, so that only the map shows through its glass (design
// review of A04-06; A04 ticket 08). Each asker counts until it is gone.
const coverers = new Set<symbol>();
const watchers = new Set<() => void>();

function tell(): void {
  for (const watcher of watchers) {
    watcher();
  }
}

function watch(watcher: () => void): () => void {
  watchers.add(watcher);
  return (): void => {
    watchers.delete(watcher);
  };
}

function isCovered(): boolean {
  return coverers.size > 0;
}

// For the main screen: whether glass lies over its map now.
export function useMapCovered(): boolean {
  return useSyncExternalStore(watch, isCovered);
}

// For what lies on glass over the map: the map's floating parts and the tab bar give way while `shown`.
export function useCoverMap(shown: boolean): void {
  useHideTabBarOnMain(shown);
  useEffect(() => {
    const coverer = shown ? Symbol('map coverer') : null;
    if (coverer !== null) {
      coverers.add(coverer);
      tell();
    }
    return (): void => {
      if (coverer !== null) {
        coverers.delete(coverer);
        tell();
      }
    };
  }, [shown]);
}
