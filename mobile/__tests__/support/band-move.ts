/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent } from '@testing-library/react-native';
import { DeviceEventEmitter } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { pass, screen } from './app';

// The time band moved whole by a drag of its body (P02 ticket 25), against the fake main server with the switch on.

const BODY = 'time-band-body';

// The track of the card's time band laid out `width` wide.
export async function layTrack(width: number): Promise<void> {
  await fireEvent(screen.getByTestId('time-band-track'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 40 } },
  });
}

export function body(): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('adjustable', { name: '시간 띠' });
}

// The body dragged by `dx` points and held there, the finger still down. `fireGestureHandler` always lifts the finger
// at the end, so the events a pan sends up to its first move are sent as the native side sends them.
export async function holdBody(dx: number): Promise<void> {
  const { handlerTag } = getByGestureTestId(BODY);
  const event = { handlerTag, numberOfPointers: 1, x: 0, y: 0, absoluteX: 0, absoluteY: 0, translationY: 0 };
  await act(() => {
    DeviceEventEmitter.emit('onGestureHandlerStateChange', {
      ...event,
      state: State.BEGAN,
      oldState: State.UNDETERMINED,
      translationX: 0,
    });
    DeviceEventEmitter.emit('onGestureHandlerStateChange', {
      ...event,
      state: State.ACTIVE,
      oldState: State.BEGAN,
      translationX: 0,
    });
    DeviceEventEmitter.emit('onGestureHandlerEvent', { ...event, state: State.ACTIVE, translationX: dx });
  });
}

// The body dragged by `dx` points and let go there.
export async function dragBody(dx: number): Promise<void> {
  await act(() => {
    fireGestureHandler(getByGestureTestId(BODY), [
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
