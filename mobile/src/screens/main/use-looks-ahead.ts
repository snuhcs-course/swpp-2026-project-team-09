/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useState } from 'react';
import { type MarkerLook, useMarkerImages } from '@/map';

// The pictures that every answer's map draws alike, made while the app rests on the everyday map, so that a first
// answer finds them made (P04 ticket 81): a meal candidate's coral numbered round (P04 ticket 85), 1 to 12, and a
// shuttle stop's dot, which has no words since P04 ticket 80. Any picture with words, the chosen place's label, a tag
// with its minutes, or the start's and the next Class's labels, is the answer's own.
export const LOOKS_AHEAD: readonly MarkerLook[] = [
  ...Array.from({ length: 12 }, (_, at): MarkerLook => ({
    kind: 'answer',
    symbol: { type: 'dot', role: 'candidate', number: at + 1, meal: true },
    label: null,
  })),
  { kind: 'answer', symbol: { type: 'dot', role: 'stop', number: null }, label: null },
];

// How long the everyday map is shown before they are made. They are asked for later than any look shown, so that the
// everyday map's own pictures come first.
export const AHEAD_AFTER_MS = 3000;

const NONE: readonly MarkerLook[] = [];

export function useLooksAhead(everyday: boolean): void {
  const [due, setDue] = useState(false);
  useEffect(() => {
    const timer = everyday && !due ? setTimeout(setDue, AHEAD_AFTER_MS, true) : 0;
    return (): void => {
      clearTimeout(timer);
    };
  }, [everyday, due]);
  useMarkerImages(NONE, due ? LOOKS_AHEAD : NONE);
}
