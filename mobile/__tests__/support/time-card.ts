/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';
import { screen } from './app';

// The card's folded parts laid out so that folded it is `height` high: its band under the top padding of 12, then the
// gap of 4 and its grip's strip of 24.
export async function layFolded(height: number): Promise<void> {
  await fireEvent(screen.getByTestId('time-card-head'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 12, width: 360, height: height - 12 - 4 - 24 } },
  });
  await fireEvent(screen.getByTestId('time-card-grip'), 'layout', {
    nativeEvent: { layout: { x: 0, y: height - 24, width: 360, height: 24 } },
  });
}

// The bar's own height top to bottom, as the phone lays it out, open or folded.
export async function layBar(height: number): Promise<void> {
  await fireEvent(screen.getByTestId('time-bar'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 360, height } },
  });
}

export function barTopOf(): number {
  const style: unknown = screen.getByTestId('time-bar').props.style;
  return Number(StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]).top);
}

// The bar's translation as React holds it: where it rests (P04 ticket 61).
export function barShift(): number {
  const style: unknown = screen.getByTestId('time-bar').props.style;
  const flat = StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
  const shift: unknown = Array.isArray(flat.transform) ? flat.transform[0] : undefined;
  return typeof shift === 'object' && shift !== null && 'translateY' in shift ? Number(shift.translateY) : 0;
}

export async function stepGrip(actionName: 'tuck' | 'untuck'): Promise<void> {
  await fireEvent(screen.getByTestId('time-card-grip'), 'accessibilityAction', { nativeEvent: { actionName } });
}

// The rows for each person laid out `height` high, as a phone lays them out before the card opens, while a screen
// reader still passes them by.
export async function layRows(height: number): Promise<void> {
  await fireEvent(screen.getByTestId('time-card-rows', { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 320, height } },
  });
}
