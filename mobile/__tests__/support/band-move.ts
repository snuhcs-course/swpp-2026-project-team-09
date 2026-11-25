/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { pass, screen } from './app';
import { holdGesture } from './hold-gesture';

// The time band moved whole by a drag on its lanes, its body among them (P02 ticket 25), against the fake main server.

const LANES = 'time-band-lanes';

// The track of the card's time band laid out `width` wide.
export async function layTrack(width: number): Promise<void> {
  await fireEvent(screen.getByTestId('time-band-track'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 40 } },
  });
}

export function body(): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('adjustable', { name: '시간 띠' });
}

// A drag that starts on the band's lanes at `x` points from the track's left, moved by `dx` points and held there, the
// finger still down.
export async function holdLanes(x: number, dx: number): Promise<void> {
  await holdGesture(LANES, x, dx);
}

// The body dragged by `dx` points and held there.
export async function holdBody(dx: number): Promise<void> {
  await holdLanes(0, dx);
}

// The body dragged by `dx` points and let go there.
export async function dragBody(dx: number): Promise<void> {
  await act(() => {
    fireGestureHandler(getByGestureTestId(LANES), [
      { translationX: 0, translationY: 0 },
      { translationX: dx, translationY: 0 },
    ]);
  });
  await pass(500);
}

// A screen reader's step of the body, five minutes.
export async function stepBody(actionName: 'increment' | 'decrement'): Promise<void> {
  await fireEvent(body(), 'accessibilityAction', { nativeEvent: { actionName } });
  await pass(500);
}
