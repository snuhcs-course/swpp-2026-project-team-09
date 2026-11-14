/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { pass, screen } from './app';
import type { FakeServer } from './fake-server';

// Correcting the answer on the map (P02 ticket 03), against the fake main server with the switch on.

// The bodies of the recalculations the app asked for, in order.
export function recalculations(server: FakeServer): unknown[] {
  return server.received('POST /assistant/answers').map(({ body }) => body);
}

// The track of the card's time band laid out 240 wide: over the stored answers' range of 11:30 to 13:30, two points a
// minute.
export async function layBand(): Promise<void> {
  await fireEvent(screen.getByTestId('time-band-track'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 240, height: 60 } },
  });
}

export function handle(bound: 'from' | 'until'): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('adjustable', { name: bound === 'from' ? '시작 시각' : '끝 시각' });
}

// A screen reader's step of a handle, five minutes.
export async function step(bound: 'from' | 'until', actionName: 'increment' | 'decrement'): Promise<void> {
  await fireEvent(handle(bound), 'accessibilityAction', { nativeEvent: { actionName } });
  await pass(500);
}

// A drag of a handle by `dx` points, let go there.
export async function drag(bound: 'from' | 'until', dx: number): Promise<void> {
  await act(() => {
    fireGestureHandler(getByGestureTestId(`time-band-${bound}`), [
      { translationX: 0, translationY: 0 },
      { translationX: dx, translationY: 0 },
    ]);
  });
  await pass(500);
}
