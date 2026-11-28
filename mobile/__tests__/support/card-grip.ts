/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

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

function styleOf(testID: string): ViewStyle {
  const style: unknown = screen.getByTestId(testID).props.style;
  return StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
}

// The sheet's scrolling part as laid out, at the most room any top leaves (P01 ticket 45), and as much of it as shows:
// less how far the sheet rests below its place. At high, what shows is high's height.
export function laidHeight(): number {
  return Number(styleOf('answer-card-content').height);
}

export function shownHeight(): number {
  const shift: unknown = styleOf('answer-card').transform?.[0];
  const down = typeof shift === 'object' && shift !== null && 'translateY' in shift ? Number(shift.translateY) : 0;
  return laidHeight() - down;
}

// One step up: low to middle, middle to high.
export async function raiseCard(): Promise<void> {
  await step('increment');
}

// One step down: a layer over the card first, then high to middle, middle to low.
export async function lowerCard(): Promise<void> {
  await step('decrement');
}
