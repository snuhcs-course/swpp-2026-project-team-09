/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { act, fireEvent, screen } from '@testing-library/react-native';
import { DeviceEventEmitter } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { PAN_STARTS } from '@/design-system/sheet-pull';

// A `BottomSheet`'s swipe (P06 ticket 35): the sheet's own anywhere on it (`sheet-drag`), or that of the list the finger
// landed in (`sheet-list-drag`). The finger lands, moves past PAN_STARTS, where the swipe takes it, and moves on; the
// events are sent as the native side sends them, so that a list may scroll while the finger is still down.

export type SwipeOn = 'sheet-drag' | 'sheet-list-drag';

interface HeldSwipe {
  // The finger `dy` down from where it landed, still down.
  move: (dy: number) => Promise<void>;
  // Let go `dy` down from where it landed, at `velocityY` points a second.
  letGo: (dy: number, velocityY?: number) => Promise<void>;
}

export async function holdSwipe(on: SwipeOn, firstMove = PAN_STARTS): Promise<HeldSwipe> {
  const { handlerTag } = getByGestureTestId(on);
  const event = { handlerTag, numberOfPointers: 1, x: 100, y: 100, absoluteX: 100, absoluteY: 100, translationX: 0 };
  const stateChange = (state: State, oldState: State, translationY: number, velocityY = 0): void => {
    DeviceEventEmitter.emit('onGestureHandlerStateChange', { ...event, state, oldState, translationY, velocityY });
  };
  await act(() => {
    stateChange(State.BEGAN, State.UNDETERMINED, 0);
    stateChange(State.ACTIVE, State.BEGAN, firstMove);
  });
  return {
    move: async (dy) => {
      await act(() => {
        DeviceEventEmitter.emit('onGestureHandlerEvent', {
          ...event,
          state: State.ACTIVE,
          translationY: dy,
          velocityY: 0,
        });
      });
    },
    letGo: async (dy, velocityY = 0) => {
      await act(() => {
        stateChange(State.END, State.ACTIVE, dy, velocityY);
      });
    },
  };
}

// A whole swipe, `dy` down, let go at `velocityY` points a second.
export async function swipe(on: SwipeOn, dy: number, velocityY = 0): Promise<void> {
  const held = await holdSwipe(on, Math.sign(dy) * PAN_STARTS);
  await held.move(dy);
  await held.letGo(dy, velocityY);
}

// The sheet labelled `label` laid out `height` tall.
export async function laySheet(label: string, height: number): Promise<void> {
  await fireEvent(screen.getByLabelText(label), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height } },
  });
}

// The scroll view `testId` scrolled `y` down from its top.
export async function scrollList(testId: string, y: number): Promise<void> {
  await fireEvent.scroll(screen.getByTestId(testId), {
    nativeEvent: {
      contentOffset: { x: 0, y },
      contentSize: { width: 390, height: 2000 },
      layoutMeasurement: { width: 390, height: 300 },
    },
  });
}
