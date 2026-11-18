/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { renderHook } from '@testing-library/react-native';
import { createRef } from 'react';
import type { MapCamera, MapHandle } from '@/map';
import { useEverydayLimits } from '@/screens/main/use-answer-map';
import type { MainMap } from '@/screens/main/use-main-map';
import { drawsItsOwnMap } from '@/screens/main/use-map-view';
import type { GuideMap } from '@/screens/main/tutorial/use-guide-map';

// A 새내기 튜토리얼 quest's guide on the map counts as drawn over the everyday map (P15 ticket 53, review of #359): the map fits
// the guide's places into the band under its bubble, which may rest further out than the whole campus, and the
// everyday map's glide back in must not undo that fit.

const FIT_ZOOM = 15.26;
// A fit of 공대 and 학생회관 into a quarter of the map's height, further out than the lowest everyday zoom.
const GUIDE_FIT: MapCamera = { centre: { latitude: 37.4545, longitude: 126.9516 }, zoom: 14.6 };

function nothing(): void {
  // A move the test does not follow.
}

const GUIDE: GuideMap = { markers: [], lines: [], onPress: nothing };

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

// Partitions: a guide alone, with nothing else drawn; nothing drawn at all.
describe('the map while a guide is open', () => {
  it('counts the guide as drawn over the everyday map, as an answer or a way is', () => {
    expect(drawsItsOwnMap({ answer: null, way: null, guide: GUIDE })).toBe(true);
    expect(drawsItsOwnMap({ answer: null, way: null, guide: null })).toBe(false);
  });

  it("does not glide the guide's fit back in, as it does once nothing is drawn", async () => {
    const moves: MapCamera[] = [];
    const { rerender } = await renderHook(
      ({ drawn }: { drawn: boolean }) => useEverydayLimits(mapAt(GUIDE_FIT, moves), drawn),
      {
        initialProps: { drawn: drawsItsOwnMap({ answer: null, way: null, guide: GUIDE }) },
      },
    );
    expect(moves).toEqual([]);

    await rerender({ drawn: drawsItsOwnMap({ answer: null, way: null, guide: null }) });

    expect(moves).toEqual([{ centre: GUIDE_FIT.centre, zoom: FIT_ZOOM }]);
  });
});
