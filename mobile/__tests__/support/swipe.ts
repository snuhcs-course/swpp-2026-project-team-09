/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-23  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

interface Swipe {
  // Where the finger starts, from the screen's left.
  fromX: number;
  // How far it moves, sideways and up or down, and how fast it moves sideways when it lets go.
  dx: number;
  dy?: number;
  vx?: number;
}

// The phone's width in the tests.
export const WIDTH = Dimensions.get('window').width;

// A swipe on the gesture with this test id: it begins, moves and lets go.
export async function swipe(testId: string, { fromX, dx, dy = 0, vx = 0 }: Swipe): Promise<void> {
  await act(() => {
    fireGestureHandler(getByGestureTestId(testId), [
      { x: fromX, absoluteX: fromX, translationX: 0, translationY: 0, velocityX: 0 },
      { x: fromX + dx, absoluteX: fromX + dx, translationX: dx, translationY: dy, velocityX: vx },
    ]);
  });
}

// Whether a gesture with this test id is in the app.
export function hasGesture(testId: string): boolean {
  try {
    getByGestureTestId(testId);
    return true;
  } catch {
    return false;
  }
}

// Whether a gesture with this test id is in the app and on, so that a swipe reaches it.
export function swipeIsOn(testId: string): boolean {
  if (!hasGesture(testId)) {
    return false;
  }
  const { config } = getByGestureTestId(testId) as { config?: { enabled?: boolean } };
  return config?.enabled !== false;
}
