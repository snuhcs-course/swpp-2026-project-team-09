/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { renderHook } from '@testing-library/react-native';
import { createRef } from 'react';
import type { MapCamera, MapHandle } from '@/map';
import { useEverydayLimits } from '@/screens/main/use-answer-map';
import type { MainMap } from '@/screens/main/use-main-map';
import { FIRST_CAMERA } from './support/answer-view';

// The emulator's numbers: the everyday map's lowest zoom, the fit zoom the map tells, is 15.26 in its view of 411 by
// 914; the camera of the stored answer's first Plan under the card of 406 rests further out, at 14.9638.
const FIT_ZOOM = 15.26;
const AT_LOWEST: MapCamera = { centre: FIRST_CAMERA.centre, zoom: FIT_ZOOM };

function nothing(): void {
  // A move the test does not follow.
}

// A stand-in for the main screen's map resting at `camera`, which records the moves it is asked.
function mapAt(camera: MapCamera, moves: MapCamera[]): MainMap {
  return {
    ref: createRef<MapHandle>(),
    onCameraIdle: nothing,
    onFitZoom: nothing,
    camera,
    fitZoom: FIT_ZOOM,
    detail: 'overview',
    zoomBy: nothing,
    goTo: nothing,
    showCampus: nothing,
    fitTo: nothing,
    fitAnswer: nothing,
    moveTo: (to): void => {
      moves.push(to);
    },
  };
}

interface Given {
  camera: MapCamera;
  // An answer's Plan or a received invitation's way is drawn.
  drawn: boolean;
}

interface Closing {
  limits: () => ReturnType<typeof useEverydayLimits>;
  rerender: (next: Given) => Promise<void>;
}

async function render(moves: MapCamera[], given: Given): Promise<Closing> {
  const { result, rerender } = await renderHook(
    ({ camera, drawn }: Given) => useEverydayLimits(mapAt(camera, moves), drawn),
    { initialProps: given },
  );
  return {
    limits: () => result.current,
    rerender: async (next): Promise<void> => {
      await rerender(next);
    },
  };
}

// Partitions: closed with the camera further out than the lowest zoom, and resting there after the glide or short of
// it; closed at the lowest zoom within the 0.01 a native map's measure differs by, and closer. Expected values: the
// answer's limits (Kakao's level 14 and the outer zoom 14.765) and the everyday map's (level 15, no outer zoom), from
// the spec's "Closing the answer".
describe('the everyday map once an answer is closed', () => {
  it("glides in to the lowest zoom first, and drops the answer's limits once the camera rests there", async () => {
    const moves: MapCamera[] = [];
    const closing = await render(moves, { camera: FIRST_CAMERA, drawn: true });
    expect(moves).toEqual([]);

    await closing.rerender({ camera: FIRST_CAMERA, drawn: false });

    expect(moves).toEqual([AT_LOWEST]);
    expect(closing.limits().nativeMinLevel).toBe(14);
    expect(closing.limits().outerZoom).toBeCloseTo(14.765, 6);

    await closing.rerender({ camera: AT_LOWEST, drawn: false });

    expect(closing.limits()).toEqual({ nativeMinLevel: 15 });
    expect(moves).toEqual([AT_LOWEST]);
  });

  it('glides in again when the camera rests short of the lowest zoom', async () => {
    const moves: MapCamera[] = [];
    const closing = await render(moves, { camera: FIRST_CAMERA, drawn: true });
    await closing.rerender({ camera: FIRST_CAMERA, drawn: false });

    await closing.rerender({ camera: { ...FIRST_CAMERA, zoom: 15.1 }, drawn: false });

    expect(moves).toEqual([AT_LOWEST, AT_LOWEST]);
    expect(closing.limits().nativeMinLevel).toBe(14);
  });

  it.each([
    ['0.005 under the lowest zoom', FIT_ZOOM - 0.005],
    ['closer than the lowest zoom', FIT_ZOOM + 0.5],
  ])("drops the answer's limits at once, with no move, for a camera %s", async (_, zoom) => {
    const moves: MapCamera[] = [];
    const camera = { ...FIRST_CAMERA, zoom };
    const closing = await render(moves, { camera, drawn: true });

    await closing.rerender({ camera, drawn: false });

    expect(closing.limits()).toEqual({ nativeMinLevel: 15 });
    expect(moves).toEqual([]);
  });
});
