/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { renderHook } from '@testing-library/react-native';
import { createRef } from 'react';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import type { LatLng } from '@/api/types';
import { drawingOf } from '@/features/assistant/answer-marks';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { type MapCamera, type MapHandle, project, unproject } from '@/map';
import type { Room } from '@/screens/main/layout';
import { useAnswerMap } from '@/screens/main/use-answer-map';
import type { MainMap } from '@/screens/main/use-main-map';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: (): object => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// The emulator's numbers: a stage of 411 by 914 under no status bar, and a card of 274, which with its label room of
// 56 leaves the area's bottom 330 from the view's bottom. Kakao's floor holds the camera at 15.515.
const ROOM: Room = { stage: { width: 411, height: 914 }, cardHeight: null, answerHeight: 274, tutorialStart: false };
const FLOOR = 15.515;

interface Asked {
  fits: number;
  centres: LatLng[];
}

// A stand-in for the main screen's map, resting at `camera`, which records the fits and the moves it is asked.
function mapAt(camera: MapCamera | null, asked: Asked): MainMap {
  const nothing = (): void => undefined;
  return {
    ref: createRef<MapHandle>(),
    onCameraIdle: nothing,
    onFitZoom: nothing,
    camera,
    fitZoom: 15,
    detail: 'overview',
    zoomBy: nothing,
    goTo: nothing,
    showCampus: nothing,
    fitTo: nothing,
    fitAnswer: (): void => {
      asked.fits += 1;
    },
    centreAt: (centre): void => {
      asked.centres.push(centre);
    },
  };
}

function shownAt(index: number): ShownAnswer {
  const nothing = (): void => undefined;
  return {
    answer: MEAL_ANSWER,
    plan: MEAL_ANSWER.plans[index] ?? null,
    index,
    browse: nothing,
    show: nothing,
    basisOpen: false,
    toggleBasis: nothing,
  };
}

// The camera at `zoom` over the middle of the box around the Plan's points, a little above the view's middle as a
// fit's padding puts it: the area's middle is 87 above the view's.
function restingOver(index: number, zoom: number): MapCamera {
  const projected = drawingOf(MEAL_ANSWER, index).points.map((point) => project(point, zoom));
  const xs = projected.map(({ x }) => x);
  const ys = projected.map(({ y }) => y);
  const middle = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 + 87 };
  return { centre: unproject(middle, zoom), zoom };
}

async function render(asked: Asked): Promise<(index: number, camera: MapCamera | null) => Promise<void>> {
  const { rerender } = await renderHook(
    ({ index, camera }: { index: number; camera: MapCamera | null }) =>
      useAnswerMap(shownAt(index), mapAt(camera, asked), ROOM, { avatars: [], cards: [] }),
    { initialProps: { index: 0, camera: null } },
  );
  return async (index, camera): Promise<void> => {
    await rerender({ index, camera });
  };
}

// Partitions: the rest after a fit with points outside the area, the rest after the move that corrects it, a rest
// after a fit with every point inside, and a new Plan that fits again. The first and third Plans' whole boxes are
// 508 points high at zoom 15.515 and the area 428 (see `answer-camera.unit.test.ts`); at zoom 15 they are 355.5.
describe("the answer's camera after a fit comes to rest", () => {
  it('moves once when points are outside, and not again after that move', async () => {
    const asked: Asked = { fits: 0, centres: [] };
    const rest = await render(asked);
    expect(asked.fits).toBe(1);

    await rest(0, restingOver(0, FLOOR));
    expect(asked.centres).toHaveLength(1);

    await rest(0, { centre: asked.centres[0] ?? { latitude: 0, longitude: 0 }, zoom: FLOOR });
    expect(asked.centres).toHaveLength(1);
    expect(asked.fits).toBe(1);
  });

  it('moves nothing when every point is inside', async () => {
    const asked: Asked = { fits: 0, centres: [] };
    const rest = await render(asked);

    await rest(0, restingOver(0, 15));

    expect(asked.centres).toEqual([]);
  });

  it('fits again for a new Plan, which may be corrected again', async () => {
    const asked: Asked = { fits: 0, centres: [] };
    const rest = await render(asked);
    await rest(0, restingOver(0, 15));

    await rest(2, restingOver(0, 15));
    expect(asked.fits).toBe(2);
    expect(asked.centres).toEqual([]);

    await rest(2, restingOver(2, FLOOR));
    expect(asked.centres).toHaveLength(1);
  });
});
