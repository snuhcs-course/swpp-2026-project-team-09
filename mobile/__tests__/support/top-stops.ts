/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { StyleSheet, type ViewStyle } from 'react-native';
import { pass, screen } from './app';

// Reading the top of an answer as it folds in stops (P01 ticket 22): where its views rest, and the sheet's high.

export type Found = ReturnType<typeof screen.getByTestId>;

export function styleOf(element: Found): ViewStyle {
  const style: unknown = element.props.style;
  return StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
}

// Where a view rests, as React holds it: its translation.
export function shiftOf(element: Found | undefined): number {
  if (element === undefined) {
    return Number.NaN;
  }
  const shift: unknown = styleOf(element).transform?.[0];
  return typeof shift === 'object' && shift !== null && 'translateY' in shift ? Number(shift.translateY) : 0;
}

// A slow drag by `dy` on the gesture named `drag`, let go with no speed.
export async function pull(drag: string, dy: number): Promise<void> {
  await act(() => {
    fireGestureHandler(getByGestureTestId(drag), [
      { translationY: 0, velocityY: 0 },
      { translationY: dy / 2, velocityY: 0 },
      { translationY: dy, velocityY: 0 },
    ]);
  });
  await pass(50);
}

// High's height: the sheet's scrolling part is laid out at it.
export function highHeight(): number {
  return Number(styleOf(screen.getByTestId('answer-card-content')).height);
}
