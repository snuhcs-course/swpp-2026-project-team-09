/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { READING_ROOM } from '@/api/mock/data/library';
import { glideDistance, glideMs, pannedOffset, pictureSize, zoomedOffset } from '@/library/cards/seat-zoom';
import type { LibrarySeat } from '@/library/replies';
import { SeatPicker } from '@/screens/main/library/seat-picker';

// The seat picture's pinch and pan (P01 ticket 11). On the user's phone (2026-11-27, preview 1.0.5) a pinch barely
// zoomed when the fingers spread sideways or across: the picture's own scroll views took the first finger's sideways
// move as a scroll, and Android then cancels the gesture handlers. One finger now moves the picture by a pan of the
// gesture handler, beside the pinch, and the scroll views take no touch of their own.

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

function lastScroll(spy: jest.SpyInstance<void, Parameters<ScrollView['scrollTo']>>, axis: 'x' | 'y'): number | null {
  const sent = spy.mock.calls.flatMap(([to]) => (typeof to === 'object' && to[axis] !== undefined ? [to[axis]] : []));
  return sent.at(-1) ?? null;
}

async function openPicture(onSeat: (picked: LibrarySeat) => void = ignoreSeat): Promise<void> {
  await render(<SeatPicker onClose={ignoreClose} onSeat={onSeat} seats={SEATS} space={READING_ROOM} visible />);
  await fireEvent(screen.getByTestId('seat-picker-scroll-down'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, ...VIEW } },
  });
}

// A pan as react-native-gesture-handler reports it: each update's translation is the total since it began.
async function pan(moves: readonly { x: number; y: number }[]): Promise<void> {
  await act(() => {
    fireGestureHandler(getByGestureTestId('seat-picker-pan'), [
      { translationX: 0, translationY: 0 },
      ...moves.map(({ x, y }) => ({ translationX: x, translationY: y })),
    ]);
  });
}

afterEach(() => {
  jest.restoreAllMocks();
});

// Partitions: a move inside the picture, past its left edge, and past its bottom. Expected values: the picture's
// edges, the view at 0 at the left and top, and at the picture's size less the view's at the right and bottom.
describe('Where one finger moves the view', () => {
  it.each([
    ['inside the picture', { x: 100, y: 0 }, { x: -40, y: 0 }, { x: 140, y: 0 }],
    ['past its left edge', { x: 50, y: 0 }, { x: 80, y: 0 }, { x: 0, y: 0 }],
    ['past its bottom', { x: 0, y: 0 }, { x: 0, y: -500 }, { x: 0, y: 2 }],
  ] as const)('moves %s and stops at the edges', (_, offset, by, to) => {
    expect(pannedOffset({ offset, by, picture: AT_ONE, view: VIEW })).toEqual(to);
  });
});

// Partitions: each edge at zoom 2 and at the most, 4. Expected values: the picture's size at that zoom less the view's.
describe('Where one finger moves the view at any zoom', () => {
  it.each([2, 4])('never passes the picture’s edges at %d times', (zoom) => {
    const picture = pictureSize(IMAGE, zoom);
    const most = { x: picture.width - VIEW.width, y: picture.height - VIEW.height };
    const middle = { x: most.x / 2, y: most.y / 2 };

    expect(pannedOffset({ offset: middle, by: { x: 5000, y: 5000 }, picture, view: VIEW })).toEqual({ x: 0, y: 0 });
    expect(pannedOffset({ offset: middle, by: { x: -5000, y: -5000 }, picture, view: VIEW })).toEqual(most);
  });
});

// Partitions: a spread at the right and bottom edge, at the left and top, and a closing whose point would leave the
// picture's edge. Expected values: the point under the fingers is where it was, scaled by the zoom, unless the view
// would leave the picture.
describe('Where a pinch keeps the point between the fingers at the edges', () => {
  const at = { x: 200, y: 100 };

  it.each([
    ['the right and bottom edges', { x: AT_ONE.width - VIEW.width, y: AT_ONE.height - VIEW.height }],
    ['the left and top edges', { x: 0, y: 0 }],
  ])('keeps it still when spread at %s', (_, offset) => {
    const point = { x: offset.x + at.x, y: offset.y + at.y };
    const picture = pictureSize(IMAGE, 2);

    const landed = zoomedOffset({ point, at, from: 1, to: 2, picture, view: VIEW });

    expect(landed.x + at.x).toBeCloseTo(point.x * 2);
    expect(landed.y + at.y).toBeCloseTo(point.y * 2);
    expect(landed.x).toBeLessThanOrEqual(picture.width - VIEW.width);
    expect(landed.y).toBeLessThanOrEqual(picture.height - VIEW.height);
  });

  it('holds the view at the edge when a closing would take it past', () => {
    const picture = pictureSize(IMAGE, 1);

    expect(zoomedOffset({ point: { x: 250, y: 120 }, at, from: 2, to: 1, picture, view: VIEW })).toEqual({
      x: 0,
      y: 0,
    });
  });
});

// Partitions: a fling, no fling, and a long time. Expected values: Reanimated's withDecay at a deceleration of 0.995
// a millisecond: v / 1000 / -ln 0.995, about 199.5 ms of the velocity.
describe('The glide after a fling', () => {
  it('slows to a stop a short way on', () => {
    expect(glideDistance(1000, 100)).toBeGreaterThan(0);
    expect(glideDistance(1000, 100)).toBeLessThan(100);
    expect(glideDistance(1000, 100_000)).toBeCloseTo(1000 / 1000 / -Math.log(0.995));
    expect(glideDistance(-1000, 100_000)).toBeCloseTo(-1000 / 1000 / -Math.log(0.995));
  });

  it('lasts until the speed is under 20 points a second, and not at all without a fling', () => {
    expect(glideMs({ x: 2000, y: 0 })).toBeCloseTo(Math.log(20 / 2000) / Math.log(0.995));
    expect(glideMs({ x: 10, y: -15 })).toBe(0);
  });
});

// Partitions: the scroll views, and a one-finger move. Expected values: the ticket and the picture's edges.
describe('The seat picture under one finger', () => {
  it('lets its scroll views take no touch, so that a sideways or slanting spread stays a pinch', async () => {
    await openPicture();

    expect(screen.getByTestId('seat-picker-scroll-down')).toHaveProp('scrollEnabled', false);
    expect(screen.getByTestId('seat-map-scroll')).toHaveProp('scrollEnabled', false);
  });

  it('moves the view with one finger, by the move since the last update, within the picture', async () => {
    await openPicture();
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');

    await pan([
      { x: -30, y: 0 },
      { x: -120, y: -10 },
    ]);
    expect(lastScroll(scrollTo, 'x')).toBe(120);
    expect(lastScroll(scrollTo, 'y')).toBe(2);

    await pan([{ x: 500, y: 0 }]);
    expect(lastScroll(scrollTo, 'x')).toBe(0);
  });
});

// A move of 40 points to the left and a release at `velocity` points a second, with `fingers` down, then `ms` of the
// glide; the offsets the scroll views were sent to across, the last first.
async function flingLeft(velocity: number, fingers: number, ms: number): Promise<number[]> {
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
  await act(() => {
    fireGestureHandler(getByGestureTestId('seat-picker-pan'), [
      { translationX: 0, translationY: 0, numberOfPointers: fingers },
      { translationX: -40, translationY: 0, numberOfPointers: fingers },
      { translationX: -40, translationY: 0, numberOfPointers: fingers, velocityX: -velocity, velocityY: 0 },
    ]);
  });
  const released = lastScroll(scrollTo, 'x') ?? 0;
  await act(() => {
    jest.advanceTimersByTime(ms);
  });
  return [lastScroll(scrollTo, 'x') ?? 0, released];
}

// Partitions: a fling, a hard fling, and two fingers. Expected values: the decay of `glideDistance` and the picture's
// edges.
describe('The seat picture after a fling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('glides on after a one-finger fling, slowing, until it is slower than 20 points a second', async () => {
    await openPicture();

    const [midway, released] = await flingLeft(800, 1, 100);
    const [stopped] = await flingLeft(0, 1, 0);

    expect(released).toBe(40);
    expect(midway).toBeGreaterThan(40);
    expect(midway).toBeLessThan(40 + glideDistance(800, glideMs({ x: 800, y: 0 })));
    expect(stopped).toBeCloseTo(midway + 40);
  });

  it('glides as far as the decay goes, and stops a hard fling at the picture’s edge', async () => {
    await openPicture();
    const [glided] = await flingLeft(800, 1, 3000);
    expect(glided).toBeCloseTo(40 + glideDistance(800, glideMs({ x: 800, y: 0 })));

    const [held] = await flingLeft(10_000, 1, 3000);
    expect(held).toBeCloseTo(AT_ONE.width - VIEW.width);
  });

  it('does not glide after two fingers', async () => {
    await openPicture();

    const [after] = await flingLeft(800, 2, 2000);

    expect(after).toBe(40);
  });
});

// Partitions: a pinch and a tap. Expected values: the ticket.
describe('The seat picture under two fingers and a tap', () => {
  it('zooms with a pinch about the point between the fingers, whichever way they spread', async () => {
    await openPicture();
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');

    await act(() => {
      fireGestureHandler(getByGestureTestId('seat-picker-pinch'), [
        { scale: 1, focalX: 200, focalY: 100 },
        { scale: 2, focalX: 200, focalY: 100 },
      ]);
    });

    expect(screen.getByTestId('seat-map-large-map-image')).toHaveStyle({ height: 600 });
    expect(lastScroll(scrollTo, 'x')).toBe(200);
    expect(lastScroll(scrollTo, 'y')).toBe(100);
  });

  it('still picks a seat with a tap', async () => {
    const onSeat = jest.fn<undefined, [LibrarySeat]>();
    await openPicture(onSeat);

    await fireEvent.press(screen.getByLabelText('7300번 빈 자리'));
    await fireEvent.press(screen.getByText('7300번 선택'));

    expect(onSeat).toHaveBeenCalledWith(SEATS[0]);
  });
});
