/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { getAnimatedStyle } from 'react-native-reanimated';
import { READING_ROOM } from '@/api/mock/data/library';
import type * as Seats from '@/library/cards/seats';
import { seatBoxes } from '@/library/cards/seats';
import type { LibrarySeat } from '@/library/replies';
import { SeatPicker } from '@/screens/main/library/seat-picker';
import booking from './support/kwanjeong/getSeatBookingList_17202.json';

// The seat picture's seats during a pinch (P01 ticket 11): on the user's phone the pinch stuttered, the picture laid out
// again, all 478 seats of 7A 열람실 2 구역 with it, at each step. The seat layer is laid out once, and a pinch only
// moves and scales it. A render of the seat layer is a call of `seatBoxes`, which it makes once each time.

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: (): object => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('@/library/cards/seats', () => {
  const actual = jest.requireActual<typeof Seats>('@/library/cards/seats');
  return { ...actual, seatBoxes: jest.fn(actual.seatBoxes) };
});

const recorded: unknown = booking;

function isSeat(value: unknown): value is LibrarySeat {
  return (
    typeof value === 'object' &&
    value !== null &&
    'VNAME' in value &&
    typeof value.VNAME === 'string' &&
    'POSX' in value &&
    typeof value.POSX === 'number'
  );
}

// The seats of 7A 열람실 2 구역 as the site listed them.
function seatsOf(reply: unknown): LibrarySeat[] {
  const response: unknown = typeof reply === 'object' && reply !== null ? Reflect.get(reply, 'response') : null;
  const list: unknown = typeof response === 'object' && response !== null ? Reflect.get(response, 'SeatList') : null;
  return Array.isArray(list) ? list.filter((seat: unknown) => isSeat(seat)) : [];
}

const SEATS = seatsOf(recorded);

function ignore(): void {
  // Nothing is picked or closed.
}

type Callback = (event: object, success?: boolean) => void;

function isCallback(value: unknown): value is Callback {
  return typeof value === 'function';
}

// The pinch's own callback, called by the test one update at a time.
function pinchCallback(name: 'onStart' | 'onUpdate' | 'onEnd'): Callback {
  const handlers: unknown = getByGestureTestId('seat-picker-pinch').handlers;
  const callback: unknown = typeof handlers === 'object' && handlers !== null ? Reflect.get(handlers, name) : null;
  if (!isCallback(callback)) {
    throw new Error(`The pinch has no ${name}`);
  }
  return callback;
}

const pinchEvent = (scale: number): object => ({ scale, focalX: 160, focalY: 149, numberOfPointers: 2 });

// One update at a time, each in its own act, as a phone's touches come one frame at a time: how many times the seat
// layer was laid out at each.
async function stepsOf(scales: readonly number[]): Promise<number[]> {
  const counts: number[] = [];
  await scales.reduce(async (previous, scale) => {
    await previous;
    const before = jest.mocked(seatBoxes).mock.calls.length;
    await act(() => {
      pinchCallback('onUpdate')(pinchEvent(scale));
    });
    counts.push(jest.mocked(seatBoxes).mock.calls.length - before);
  }, Promise.resolve());
  return counts;
}

async function pinchStepByStep(scales: readonly number[]): Promise<number[]> {
  await act(() => {
    pinchCallback('onStart')(pinchEvent(1));
  });
  const counts = await stepsOf(scales);
  await act(() => {
    pinchCallback('onEnd')(pinchEvent(scales.at(-1) ?? 1), true);
  });
  return counts;
}

async function openRoom(): Promise<void> {
  await render(<SeatPicker onClose={ignore} onSeat={ignore} seats={SEATS} space={READING_ROOM} visible />);
  await fireEvent(screen.getByTestId('seat-picker-view'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 298 } },
  });
}

// The numbers are drawn but are no accessible element of their own.
const HIDDEN = { includeHiddenElements: true };

describe('The seats of 7A 열람실 2 구역 during a pinch', () => {
  it('are not laid out again at any step of the pinch', async () => {
    await openRoom();

    const counts = await pinchStepByStep([1.1, 1.25, 1.5, 1.8, 2.2, 2.6]);

    expect(SEATS).toHaveLength(478);
    expect(counts).toEqual([0, 0, 0, 0, 0, 0]);
    // The pinch did zoom: the layer, laid out at 4, is seen at 2.6.
    const style: unknown = getAnimatedStyle(screen.getByTestId('seat-picker-layer'));
    const transform: unknown = typeof style === 'object' && style !== null ? Reflect.get(style, 'transform') : null;
    expect(Array.isArray(transform) ? transform.at(-1) : null).toEqual({ scale: 2.6 / 4 });
  });
});

// Partitions: a pinch in past where the room's four-digit numbers fit (about 3 times), and back out in the same
// gesture. Expected values: the user's ask (P01 ticket 12), the numbers while zooming, by one switch a crossing: the
// seat layer drawn again once at the step that crosses, before the fingers lift.
describe('The seat numbers of 7A 열람실 2 구역 during a pinch', () => {
  it('show once the zoom passes where four digits fit, the seats drawn again once, and go once it is back under', async () => {
    await openRoom();
    await act(() => {
      pinchCallback('onStart')(pinchEvent(1));
    });

    const up = await stepsOf([1.5, 2.2, 2.8, 3.2, 3.6]);
    expect(up).toEqual([0, 0, 0, 1, 0]);
    expect(screen.getByTestId('seat-number-7193', HIDDEN)).toHaveTextContent('7193');

    const down = await stepsOf([3.2, 2.8, 2.2]);
    expect(down).toEqual([0, 1, 0]);
    expect(screen.queryByTestId('seat-number-7193', HIDDEN)).toBeNull();
  });
});
