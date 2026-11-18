/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { renderHook } from '@testing-library/react-native';
import { createRef } from 'react';
import type { MapCamera, MapHandle } from '@/map';
import type { MainMap } from '@/screens/main/use-main-map';
import { useGuideCameraBack } from '@/screens/main/tutorial/use-guide-map';

// Closing a 새내기 튜토리얼 quest's guide brings the camera back to where it was when the guide opened, but not when the
// guide gave way to a card a push selected, which brought the camera to its own place (P15 ticket 53, review of #359).

const BEFORE: MapCamera = { centre: { latitude: 37.4592, longitude: 126.9519 }, zoom: 15.4 };
const GUIDE: MapCamera = { centre: { latitude: 37.4545, longitude: 126.9516 }, zoom: 14.6 };

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
    fitZoom: 15.26,
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
  open: boolean;
  camera: MapCamera;
  overMap: boolean;
}

async function render(moves: MapCamera[]): Promise<(next: Given) => Promise<void>> {
  const { rerender } = await renderHook(
    ({ open, camera, overMap }: Given) => {
      useGuideCameraBack(open, { map: mapAt(camera, moves), overMap });
    },
    { initialProps: { open: false, camera: BEFORE, overMap: false } },
  );
  return async (next) => {
    await rerender(next);
  };
}

// Partitions: closed by its own ✕ or ←; closed as it gave way to a selected card.
describe('the camera once a guide closes', () => {
  it('goes back to where it was when the guide opened', async () => {
    const moves: MapCamera[] = [];
    const next = await render(moves);
    await next({ open: true, camera: BEFORE, overMap: false });
    await next({ open: true, camera: GUIDE, overMap: false });

    await next({ open: false, camera: GUIDE, overMap: false });

    expect(moves).toEqual([BEFORE]);
  });

  it("stays where a push's card brought it, when the guide gave way to the card", async () => {
    const moves: MapCamera[] = [];
    const next = await render(moves);
    await next({ open: true, camera: BEFORE, overMap: false });
    await next({ open: true, camera: GUIDE, overMap: true });

    await next({ open: false, camera: GUIDE, overMap: true });

    expect(moves).toEqual([]);
  });
});
