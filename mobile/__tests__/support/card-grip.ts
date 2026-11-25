/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, screen } from '@testing-library/react-native';

// The answer card's grip (P04 tickets 52 and 61). Nothing on the card is pressed to raise or lower it: a finger drags
// the card, and a screen reader steps it up and down through the grip's actions, which these take.

type Found = ReturnType<typeof screen.getByTestId>;

export function grip(): Found {
  return screen.getByTestId('answer-card-handle');
}

export const HIDDEN = { includeHiddenElements: true } as const;

async function step(actionName: 'increment' | 'decrement' | 'close'): Promise<void> {
  await fireEvent(grip(), 'accessibilityAction', { nativeEvent: { actionName } });
}

// One step up: low to middle, middle to high.
export async function raiseCard(): Promise<void> {
  await step('increment');
}

// One step down: a layer over the card first, then high to middle, middle to low.
export async function lowerCard(): Promise<void> {
  await step('decrement');
}
