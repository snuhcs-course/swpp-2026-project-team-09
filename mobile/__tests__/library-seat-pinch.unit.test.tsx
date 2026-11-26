/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { getAnimatedStyle } from 'react-native-reanimated';
import { READING_ROOM } from '@/api/mock/data/library';
import { pictureSize } from '@/library/cards/seat-zoom';
import type { LibrarySeat } from '@/library/replies';
import { SeatPicker } from '@/screens/main/library/seat-picker';

// The seat picture's pinch and pan (P01 ticket 11). On the user's phone (2026-11-27, preview 1.0.5) a pinch barely
// zoomed when the fingers spread sideways or across: the picture's own scroll views took the first finger's sideways
// move as a scroll, and Android then cancels the gesture handlers. Then, with a pan beside the pinch, it stuttered: the
// picture was moved from the JS thread and laid out again at each step. The picture is now one layer, laid out once at
// the most zoom, that a pan and a pinch move and scale on the UI thread, with a fling's glide by `withDecay`.

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: (): object => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// The picture's view as the test lays it out, and the picture of 7A 열람실 2 구역 at zoom 1: 633 × 300 points.
const VIEW = { width: 320, height: 298 };
const IMAGE = { width: 2529, height: 1198 };
const AT_ONE = pictureSize(IMAGE, 1);

const seat = (name: string, x: number): LibrarySeat => ({
  SEATNO: Number(name),
  NAME: name,
  VNAME: name,
  SECTORNO: 17202,
  STATUS: 1,
  USECNT: 0,
  POSX: x,
  POSY: 237,
  POSW: 33,
  POSH: 28,
  GR_MIN: 0,
  GR_MAX: 0,
});

const SEATS = [seat('7300', 1468), seat('7301', 300)];

function ignoreSeat(): void {
  // The test picks no seat.
}

function ignoreClose(): void {
  // The test does not close the picture.
}

async function openPicture(onSeat: (picked: LibrarySeat) => void = ignoreSeat): Promise<void> {
  await render(<SeatPicker onClose={ignoreClose} onSeat={onSeat} seats={SEATS} space={READING_ROOM} visible />);
  await fireEvent(screen.getByTestId('seat-picker-view'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, ...VIEW } },
  });
}

// Where the view stands on the picture, read from the seat layer's move and scale once a frame has passed: the layer is
// laid out at 4.
async function seen(): Promise<{ x: number; y: number; zoom: number }> {
  await pass(FRAME);
  const style: unknown = getAnimatedStyle(screen.getByTestId('seat-picker-layer'));
  const { transform } = StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
  const parts: unknown[] = Array.isArray(transform) ? transform : [];
  const part = (at: number, key: string): number => {
    const one = parts[at];
    return typeof one === 'object' && one !== null && key in one ? Number(Reflect.get(one, key)) : Number.NaN;
  };
  return { x: -part(0, 'translateX'), y: -part(1, 'translateY'), zoom: part(2, 'scale') * 4 };
}

// A pan as react-native-gesture-handler reports it: each update's translation is the total since it began; the last
// update's velocity is the release's.
async function pan(
  moves: readonly { x: number; y: number }[],
  { fingers = 1, velocity = 0 }: { fingers?: number; velocity?: number } = {},
): Promise<void> {
  await act(() => {
    fireGestureHandler(getByGestureTestId('seat-picker-pan'), [
      { translationX: 0, translationY: 0, numberOfPointers: fingers },
      ...moves.map(({ x, y }) => ({ translationX: x, translationY: y, numberOfPointers: fingers })),
      {
        translationX: moves.at(-1)?.x ?? 0,
        translationY: moves.at(-1)?.y ?? 0,
        numberOfPointers: fingers,
        velocityX: velocity,
        velocityY: 0,
      },
    ]);
  });
}

const FRAME = 20;
// Longer than a button's move of 200 ms.
const STEP = 300;

// A pinch as react-native-gesture-handler reports it: each update's scale is the total since the fingers came down.
async function pinchTo(scales: readonly number[]): Promise<void> {
  await act(() => {
    fireGestureHandler(
      getByGestureTestId('seat-picker-pinch'),
      [1, ...scales].map((scale) => ({ scale, focalX: 160, focalY: 149 })),
    );
  });
}

// Where a seat is drawn in the view: its box in the layer, laid out at 4, moved and scaled as the layer is.
async function drawnBox(name: string): Promise<{ left: number; top: number; right: number; bottom: number }> {
  const at = await seen();
  const own: unknown = screen.getByLabelText(new RegExp(`^${name}번`, 'u')).props.style;
  const { left, top, width, height } = StyleSheet.flatten<ViewStyle>(Array.isArray(own) ? own : [own]);
  const scale = at.zoom / 4;
  const [x, y] = [Number(left) * scale - at.x, Number(top) * scale - at.y];
  return { left: x, top: y, right: x + Number(width) * scale, bottom: y + Number(height) * scale };
}

function holds(box: { left: number; top: number; right: number; bottom: number }, x: number, y: number): boolean {
  return box.left <= x && x <= box.right && box.top <= y && y <= box.bottom;
}

async function pass(ms: number): Promise<void> {
  await act(() => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// Partitions: the picture's layer, one finger inside and past the edges. Expected values: the ticket and the
// picture's edges.
describe('The seat picture under one finger', () => {
  it('has no scroll view: one layer laid out at 4 times, seen at 1', async () => {
    await openPicture();

    expect(screen.queryByTestId('seat-picker-scroll-down')).toBeNull();
    expect(screen.getByTestId('seat-map-large-map-image')).toHaveStyle({ height: 1200 });
    expect(await seen()).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('moves the view by the change since the last update, held within the picture', async () => {
    await openPicture();

    await pan([
      { x: -30, y: 0 },
      { x: -120, y: -10 },
    ]);
    expect(await seen()).toMatchObject({ x: 120, y: 2 });

    await pan([{ x: 500, y: 0 }]);
    expect(await seen()).toMatchObject({ x: 0 });
  });
});

// Partitions: a fling, a hard fling, a touch during the glide, and two fingers. Expected values: `withDecay` held at the
// picture's edges.
describe('The seat picture after a fling', () => {
  it('glides on after a one-finger fling, and a touch stops it', async () => {
    await openPicture();

    await pan([{ x: -40, y: 0 }], { velocity: -600 });
    await pass(50);
    const gliding = (await seen()).x;
    await pan([{ x: 0, y: 0 }]);
    const stopped = (await seen()).x;
    await pass(1000);

    expect(gliding).toBeGreaterThan(40);
    expect((await seen()).x).toBe(stopped);
  });

  it('stops a hard fling at the picture’s edge, and gives no glide after two fingers', async () => {
    await openPicture();

    await pan([{ x: -40, y: 0 }], { velocity: -10_000 });
    await pass(3000);
    expect((await seen()).x).toBeCloseTo(AT_ONE.width - VIEW.width);

    await pan([{ x: 100, y: 0 }], { fingers: 2, velocity: 3000 });
    const released = (await seen()).x;
    await pass(3000);
    expect((await seen()).x).toBe(released);
  });
});

// Partitions: a pinch, a pinch past the most, and pinches in and out. Expected values: the ticket.
describe('The seat picture under two fingers', () => {
  it('zooms with a pinch about the point between the fingers, and no further than 4 times', async () => {
    await openPicture();

    await act(() => {
      fireGestureHandler(getByGestureTestId('seat-picker-pinch'), [
        { scale: 1, focalX: 200, focalY: 100 },
        { scale: 2, focalX: 200, focalY: 100 },
      ]);
    });
    expect(await seen()).toEqual({ x: 200, y: 100, zoom: 2 });

    await act(() => {
      fireGestureHandler(getByGestureTestId('seat-picker-pinch'), [
        { scale: 1, focalX: 160, focalY: 149 },
        { scale: 5, focalX: 160, focalY: 149 },
      ]);
    });
    expect((await seen()).zoom).toBe(4);
  });
  it("zooms by a pinch's total scale since the fingers came down, without compounding it", async () => {
    await openPicture();

    await pinchTo([1.05, 1.1, 1.2, 1.3, 1.4, 1.5]);
    expect((await seen()).zoom).toBeCloseTo(1.5);
    await pinchTo([1.4, 1.2]);
    expect((await seen()).zoom).toBeCloseTo(1.8);
    await pinchTo([0.9, 0.5, 0.2]);
    expect((await seen()).zoom).toBe(1);
  });
});

// Partitions: the buttons, a picked seat, quick presses, and a tap. Expected values: the ticket.
describe('The seat picture’s buttons and a tap', () => {
  it('zooms with 확대 and 축소 about the middle of the view, in a short move', async () => {
    await openPicture();

    await fireEvent.press(screen.getByLabelText('확대'));
    await pass(STEP);
    expect(await seen()).toEqual({ x: 160 * 1.5 - 160, y: 149 * 1.5 - 149, zoom: 1.5 });
    await fireEvent.press(screen.getByLabelText('축소'));
    await pass(STEP);
    expect(await seen()).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('brings a picked seat to the middle with 확대, the top edge holding the view', async () => {
    await openPicture();

    await fireEvent.press(screen.getByLabelText('7300번 빈 자리'));
    await fireEvent.press(screen.getByLabelText('확대'));
    await pass(STEP);

    // Seat 7300's box is at 1468 × 237 of the 2529-pixel image, 33 × 28 pixels: at 1.5 its middle comes to the view's
    // middle across, and the picture's top holds the view at 0.
    const scale = pictureSize(IMAGE, 1.5).width / IMAGE.width;
    const at = await seen();
    expect(at.x).toBeCloseTo((1468 + 16.5) * scale - VIEW.width / 2);
    expect(at.y).toBe(0);
  });

  it('takes a step for each quick press of 확대, during the move of the last', async () => {
    await openPicture();

    await fireEvent.press(screen.getByLabelText('확대'));
    await fireEvent.press(screen.getByLabelText('확대'));
    await fireEvent.press(screen.getByLabelText('확대'));
    await fireEvent.press(screen.getByLabelText('확대'));
    await pass(STEP);

    expect((await seen()).zoom).toBe(4);
  });

  it('still picks a seat with a tap', async () => {
    const onSeat = jest.fn<undefined, [LibrarySeat]>();
    await openPicture(onSeat);

    await fireEvent.press(screen.getByLabelText('7300번 빈 자리'));
    await fireEvent.press(screen.getByText('7300번 선택'));

    expect(onSeat).toHaveBeenCalledWith(SEATS[0]);
  });
});

// Partitions: 1, 2 and 4 times. Expected values: the picture's own place of each seat, which the gestures' maths use,
// and the seat whose box holds the point. The phone's own touch finds the view under the finger through the layer's
// transform, as drawn; only the phone shows that.
describe('A tap on the seat picture at every zoom', () => {
  it('lands at 1 on the seat drawn there, at its place in the picture', async () => {
    const onSeat = jest.fn<undefined, [LibrarySeat]>();
    await openPicture(onSeat);

    // Seat 7301 is in the view at 1, at 300 × 237 of the image.
    const box = await drawnBox('7301');
    expect(box.left).toBeCloseTo(300 * (pictureSize(IMAGE, 1).width / IMAGE.width));
    await fireEvent.press(screen.getByLabelText('7301번 빈 자리'));
    await fireEvent.press(screen.getByText('7301번 선택'));

    expect(onSeat).toHaveBeenCalledWith(SEATS[1]);
  });

  it.each([2, 4])(
    'lands at %d times on the picked seat drawn at the view’s middle, not its neighbour',
    async (zoom) => {
      await openPicture();
      await fireEvent.press(screen.getByLabelText('7300번 빈 자리'));
      // 1.5 and 2, or on to 3 and 4: one press a step.
      await (zoom === 2 ? [1, 2] : [1, 2, 3, 4]).reduce(async (previous) => {
        await previous;
        await fireEvent.press(screen.getByLabelText('확대'));
      }, Promise.resolve());
      await pass(STEP);

      const picked = await drawnBox('7300');
      // Across, 7300 is at the view's middle; down, the picture's top may hold it higher.
      const point = { x: VIEW.width / 2, y: (picked.top + picked.bottom) / 2 };
      expect((await seen()).zoom).toBe(zoom);
      expect(holds(picked, point.x, point.y)).toBe(true);
      expect(holds(await drawnBox('7301'), point.x, point.y)).toBe(false);
    },
  );
});
