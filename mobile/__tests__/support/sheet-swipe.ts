/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent, screen } from '@testing-library/react-native';
import { DeviceEventEmitter } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { PAN_STARTS } from '@/design-system/sheet-pull';

// A drag on a `BottomSheet`'s handle bar (P06 ticket 35, `sheet-drag`). The finger lands, moves past PAN_STARTS, where
// the drag takes it, and moves on; the events are sent as the native side sends them, so that the finger may stay down
// between moves.

interface HeldDrag {
  // The finger `dy` down from where it landed, still down.
  move: (dy: number) => Promise<void>;
  // Let go `dy` down from where it landed, at `velocityY` points a second.
  letGo: (dy: number, velocityY?: number) => Promise<void>;
}

// `gesture` is the handle bar's and the head's drag, or the body's pull (P06 ticket 53).
export async function holdHandleDrag(
  firstMove = PAN_STARTS,
  gesture: 'sheet-drag' | 'sheet-body-drag' = 'sheet-drag',
): Promise<HeldDrag> {
  const { handlerTag } = getByGestureTestId(gesture);
  const event = { handlerTag, numberOfPointers: 1, x: 100, y: 10, absoluteX: 100, absoluteY: 10, translationX: 0 };
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

// A whole pull on the sheet's body, `dy` down, let go at `velocityY` points a second.
export async function dragBody(dy: number, velocityY = 0): Promise<void> {
  const held = await holdHandleDrag(Math.sign(dy) * PAN_STARTS, 'sheet-body-drag');
  await held.move(dy);
  await held.letGo(dy, velocityY);
}

// A whole drag on the handle bar, `dy` down, let go at `velocityY` points a second.
export async function dragHandle(dy: number, velocityY = 0): Promise<void> {
  const held = await holdHandleDrag(Math.sign(dy) * PAN_STARTS);
  await held.move(dy);
  await held.letGo(dy, velocityY);
}

// The sheet labelled `label` laid out `height` tall.
export async function laySheet(label: string, height: number): Promise<void> {
  await fireEvent(screen.getByLabelText(label), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height } },
  });
}
