/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AskLevel } from './plan-quest-types';

type Listener = (asks: readonly AskLevel[]) => void;

const listeners = new Set<Listener>();

// Listens for the Friends of a Plan made into a Quest whom the User was not asked about yet. Answers how to stop.
export function onAskLevels(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The client tells it when `makePlanQuest` answers, so that the screen that made the Quest asks nothing itself.
export function tellAskLevels(asks: readonly AskLevel[]): void {
  if (asks.length === 0) {
    return;
  }
  for (const listener of listeners) {
    listener(asks);
  }
}
