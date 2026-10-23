/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useEffect, useSyncExternalStore } from 'react';
import { BackHandler } from 'react-native';

// What a swipe from the left edge closes, the latest to open last, and who watches it.
const edgeClosers: (() => void)[] = [];
const watchers = new Set<() => void>();

function changed(): void {
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

function latestCloser(): (() => void) | null {
  return edgeClosers.at(-1) ?? null;
}

// How Android's back button closes what leaves the screen behind it in view: an open card on the map, a side panel
// or a bottom sheet. While `open`, the press closes it and goes no further; the latest to open is closed first, and
// with nothing open the press goes on to the navigation. A part of a tab that stays mounted behind another passes
// `open` only while its tab is in front. A screen above the tabs is the stack's, and a Dialog is closed by its Modal.
// A swipe from the left edge closes it too, as the press does, unless `edge` is false: what lies on the map without
// covering its edge, which the map's own drags need.
export function useBackToClose(open: boolean, close: () => void, { edge = true }: { edge?: boolean } = {}): void {
  useEffect(() => {
    const back = open
      ? BackHandler.addEventListener('hardwareBackPress', () => {
          close();
          return true;
        })
      : null;
    const swiped = open && edge ? close : null;
    if (swiped !== null) {
      edgeClosers.push(swiped);
      changed();
    }
    return (): void => {
      back?.remove();
      if (swiped !== null) {
        edgeClosers.splice(edgeClosers.lastIndexOf(swiped), 1);
        changed();
      }
    };
  }, [open, close, edge]);
}

// What a swipe from the left edge closes now, the latest to open, or null with nothing open.
export function useEdgeCloser(): (() => void) | null {
  return useSyncExternalStore(watch, latestCloser);
}
