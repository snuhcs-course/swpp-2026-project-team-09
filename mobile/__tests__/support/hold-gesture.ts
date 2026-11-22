/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { DeviceEventEmitter } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

type MoveHeld = (dx: number) => Promise<void>;

// A pan on the gesture `testId` that starts `x` points from its view's left, moved by `dx` points and held there, the
// finger still down. `fireGestureHandler` always lifts the finger at the end, so the events a pan sends up to its first
// move are sent as the native side sends them. The pan's later moves, the finger still down, go through the function
// it gives back.
export async function holdGesture(testId: string, x: number, dx: number): Promise<MoveHeld> {
  const { handlerTag } = getByGestureTestId(testId);
  const event = { handlerTag, numberOfPointers: 1, x, y: 0, absoluteX: x, absoluteY: 0, translationY: 0 };
  // A render while the finger is down may give the pan a new handler, as its gesture is made again with new values.
  const move: MoveHeld = async (to) => {
    const now = getByGestureTestId(testId).handlerTag;
    await act(() => {
      DeviceEventEmitter.emit('onGestureHandlerEvent', {
        ...event,
        handlerTag: now,
        state: State.ACTIVE,
        translationX: to,
      });
    });
  };
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
  });
  await move(dx);
  return move;
}
