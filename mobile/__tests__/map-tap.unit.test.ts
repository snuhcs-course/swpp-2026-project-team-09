/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { act, renderHook } from '@testing-library/react-native';
import { isTap, TAP_WAIT_MS, type TouchEventLike, useMapTap } from '@/screens/main/tutorial/use-map-tap';

// A tap on the map, told from the touches on a View around it: a short touch of one finger that moves little
// removes the tutorial place pin, unless the pin's own marker press comes with it.

interface Touch {
  x: number;
  y: number;
  at: number;
  // The fingers on the screen after the event: with the new one at a start, without the lifted one at an end.
  fingers: number;
}

function touch({ x, y, at, fingers }: Touch): TouchEventLike {
  const touches = Array.from({ length: fingers }, () => ({}));
  return { nativeEvent: { pageX: x, pageY: y, timestamp: at, touches } };
}

async function setUp(active = true): Promise<{ onTap: jest.Mock; tap: () => ReturnType<typeof useMapTap> }> {
  const onTap = jest.fn();
  const { result } = await renderHook(() =>
    useMapTap(() => {
      onTap();
    }, active),
  );
  return { onTap, tap: () => result.current };
}

async function touchAndLift(tap: () => ReturnType<typeof useMapTap>, start: Touch, end: Touch): Promise<void> {
  await act(() => {
    tap().touches.onTouchStart(touch(start));
  });
  await act(() => {
    tap().touches.onTouchEnd(touch(end));
  });
}

async function wait(ms: number): Promise<void> {
  await act(() => {
    jest.advanceTimersByTime(ms);
  });
}

const DOWN = { x: 100, y: 200, at: 1000, fingers: 1 };
const UP = { x: 104, y: 203, at: 1120, fingers: 0 };

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('isTap', () => {
  it('takes a short touch that moves little', () => {
    expect(isTap({ x: 0, y: 0, at: 0 }, { x: 6, y: 8, at: 250 })).toBe(true);
  });

  it('takes neither a drag nor a long press', () => {
    expect(isTap({ x: 0, y: 0, at: 0 }, { x: 9, y: 9, at: 100 })).toBe(false);
    expect(isTap({ x: 0, y: 0, at: 0 }, { x: 0, y: 0, at: 251 })).toBe(false);
  });
});

describe('a touch on the map', () => {
  it('that is a tap clears the pin once the wait is over', async () => {
    const { onTap, tap } = await setUp();

    await touchAndLift(tap, DOWN, UP);
    expect(onTap).not.toHaveBeenCalled();
    await wait(TAP_WAIT_MS);

    expect(onTap).toHaveBeenCalledTimes(1);
  });
});

describe('a touch on the map that is no tap', () => {
  it('drags, as a pan does, and keeps it', async () => {
    const { onTap, tap } = await setUp();

    await touchAndLift(tap, DOWN, { ...UP, x: 160 });
    await wait(TAP_WAIT_MS);

    expect(onTap).not.toHaveBeenCalled();
  });

  it('is held long and keeps it', async () => {
    const { onTap, tap } = await setUp();

    await touchAndLift(tap, DOWN, { ...UP, at: DOWN.at + 600 });
    await wait(TAP_WAIT_MS);

    expect(onTap).not.toHaveBeenCalled();
  });

  it('is of two fingers, as a pinch, and keeps it, however short', async () => {
    const { onTap, tap } = await setUp();

    await act(() => {
      tap().touches.onTouchStart(touch(DOWN));
    });
    await act(() => {
      tap().touches.onTouchStart(touch({ x: 180, y: 260, at: 1020, fingers: 2 }));
    });
    await act(() => {
      tap().touches.onTouchEnd(touch({ ...UP, fingers: 1 }));
    });
    await act(() => {
      tap().touches.onTouchEnd(touch({ x: 182, y: 262, at: 1140, fingers: 0 }));
    });
    await wait(TAP_WAIT_MS);

    expect(onTap).not.toHaveBeenCalled();
  });
});

describe("a tap with the pin's own press", () => {
  it('before it, within the wait, keeps the pin', async () => {
    const { onTap, tap } = await setUp();

    await touchAndLift(tap, DOWN, UP);
    await wait(TAP_WAIT_MS / 2);
    await act(() => {
      tap().keep();
    });
    await wait(TAP_WAIT_MS);

    expect(onTap).not.toHaveBeenCalled();
  });

  it('after it keeps the pin', async () => {
    const { onTap, tap } = await setUp();

    await act(() => {
      tap().keep();
    });
    await touchAndLift(tap, DOWN, UP);
    await wait(TAP_WAIT_MS);

    expect(onTap).not.toHaveBeenCalled();
  });
});

describe('a touch on the map that is not counted', () => {
  it('is cancelled, as when the map takes the gesture, and keeps the pin', async () => {
    const { onTap, tap } = await setUp();

    await act(() => {
      tap().touches.onTouchStart(touch(DOWN));
    });
    await act(() => {
      tap().touches.onTouchCancel();
    });
    await act(() => {
      tap().touches.onTouchEnd(touch(UP));
    });
    await wait(TAP_WAIT_MS);

    expect(onTap).not.toHaveBeenCalled();
  });

  it('comes while there is no pin', async () => {
    const { onTap, tap } = await setUp(false);

    await touchAndLift(tap, DOWN, UP);
    await wait(TAP_WAIT_MS);

    expect(onTap).not.toHaveBeenCalled();
  });
});
