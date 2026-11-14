/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useSyncExternalStore } from 'react';
import { keep, readKept } from '@/storage/kept';

// The switch of the answer on the map, which the phone keeps: null until the phone has said.
let known: boolean | null = null;
// Which start of the app a read of the phone belongs to: a read from before `forgetAnswerSwitch` is dropped.
let appStarts = 0;
let reading = false;
const readers = new Set<() => void>();

function tell(): void {
  for (const reader of readers) {
    reader();
  }
}

function subscribe(reader: () => void): () => void {
  readers.add(reader);
  return (): void => {
    readers.delete(reader);
  };
}

function isOn(): boolean {
  return known === true;
}

function readOnce(): void {
  if (known !== null || reading) {
    return;
  }
  reading = true;
  const asked = appStarts;
  void readKept().then(
    ({ answerOnMap }) => {
      if (asked === appStarts && known === null) {
        known = answerOnMap;
        tell();
      }
    },
    () => {
      // A phone that cannot be read counts as off, and a later reader reads it again.
      if (asked === appStarts) {
        reading = false;
      }
    },
  );
}

// Whether the answer is shown on the map, off until the phone has said. Every reader follows a change at once.
export function useAnswerSwitch(): boolean {
  useEffect(readOnce, []);
  return useSyncExternalStore(subscribe, isOn);
}

export async function setAnswerSwitch(on: boolean): Promise<void> {
  known = on;
  tell();
  await keep({ answerOnMap: on });
}

// For the tests: a new start of the app.
export function forgetAnswerSwitch(): void {
  known = null;
  reading = false;
  appStarts += 1;
}
