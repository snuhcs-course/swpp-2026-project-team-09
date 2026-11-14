/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { act, renderHook } from '@testing-library/react-native';
import { createRef } from 'react';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import type { LatLng } from '@/api/types';
import { drawingOf } from '@/features/assistant/answer-marks';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { type MapCamera, type MapHandle, type MarkerLook, project, unproject } from '@/map';
import type * as MarkerImages from '@/map/marker-images';
import { useMarkerImages } from '@/map/marker-images';
import type { Room } from '@/screens/main/layout';
import { useAnswerMap } from '@/screens/main/use-answer-map';
import type { MainMap } from '@/screens/main/use-main-map';

jest.mock('@/map/marker-images', () => {
  const actual = jest.requireActual<typeof MarkerImages>('@/map/marker-images');
  return { ...actual, useMarkerImages: jest.fn(actual.useMarkerImages) };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: (): object => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// The emulator's numbers: a stage of 411 by 914 under no status bar, and a card of 274, which with the room of 72
// for a label below a point leaves the area's bottom 346 from the view's bottom. Kakao's floor holds the camera at
// 15.515.
const ROOM: Room = { stage: { width: 411, height: 914 }, cardHeight: null, answerHeight: 274, tutorialStart: false };
const FLOOR = 15.515;

function nothing(): void {
  // A move the test does not follow.
}

interface Asked {
  fits: number;
  centres: LatLng[];
}

// A stand-in for the main screen's map, resting at `camera`, which records the fits and the moves it is asked.
function mapAt(camera: MapCamera | null, asked: Asked): MainMap {
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
  return {
    answer: MEAL_ANSWER,
    plan: MEAL_ANSWER.plans[index] ?? null,
    index,
    browse: nothing,
    show: nothing,
    basisOpen: false,
    toggleBasis: nothing,
    source: MEAL_ANSWER,
    recalculating: false,
    change: nothing,
    ghost: null,
    undo: nothing,
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

// As long as a fit's glide takes before the map can tell of its rest.
async function fitGlides(): Promise<void> {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(500);
  });
}

// Partitions: the rest after a fit with points outside the area, the rest after the move that corrects it, a rest
// with every point inside, a rest told sooner than a fit's glide can end (as a change of the view's size tells one
// while the fit is on its way), a rest told long after the fit (the User's own move), and a new Plan that fits
// again. The first and third Plans' whole boxes are 508 points high at zoom 15.515 and the area 412 (see
// `answer-camera.unit.test.ts`); at zoom 15 they are 355.5.
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("the answer's camera after a fit comes to rest", () => {
  it('moves once when points are outside, and not again after that move', async () => {
    const asked: Asked = { fits: 0, centres: [] };
    const rest = await render(asked);
    expect(asked.fits).toBe(1);

    await fitGlides();
    await rest(0, restingOver(0, FLOOR));
    expect(asked.centres).toHaveLength(1);

    await rest(0, { centre: asked.centres[0] ?? { latitude: 0, longitude: 0 }, zoom: FLOOR });
    expect(asked.centres).toHaveLength(1);
    expect(asked.fits).toBe(1);
  });

  it('moves nothing when every point is inside', async () => {
    const asked: Asked = { fits: 0, centres: [] };
    const rest = await render(asked);

    await fitGlides();
    await rest(0, restingOver(0, 15));

    expect(asked.centres).toEqual([]);
  });

  it('fits again for a new Plan, which may be corrected again', async () => {
    const asked: Asked = { fits: 0, centres: [] };
    const rest = await render(asked);
    await fitGlides();
    await rest(0, restingOver(0, 15));

    await rest(2, restingOver(0, 15));
    expect(asked.fits).toBe(2);
    expect(asked.centres).toEqual([]);

    await fitGlides();
    await rest(2, restingOver(2, FLOOR));
    expect(asked.centres).toHaveLength(1);
  });
});

// Partitions: a rest told just sooner than a fit's glide can end and one told right when it can, and a rest told
// just after the longest the fit's rest may take.
describe("a rest that is not the fit's", () => {
  it('leaves a rest told sooner than the fit can end, and checks the one after it', async () => {
    const asked: Asked = { fits: 0, centres: [] };
    const rest = await render(asked);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(499);
    });
    await rest(0, restingOver(2, FLOOR));
    expect(asked.centres).toEqual([]);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    await rest(0, restingOver(0, FLOOR));
    expect(asked.centres).toHaveLength(1);
  });

  it("leaves a rest told long after the fit, which is no longer the fit's", async () => {
    const asked: Asked = { fits: 0, centres: [] };
    const rest = await render(asked);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(3001);
    });
    await rest(0, restingOver(0, FLOOR));

    expect(asked.centres).toEqual([]);
  });
});

function titled(looks: readonly MarkerLook[], title: string): boolean {
  return looks.some((look) => look.kind === 'answer' && look.label?.title === title);
}

// Partitions: a look that only another Plan than the one on screen draws. The third Plan's flag "12:18 민수와 만남"
// stands at its Merging Point; the first Plan has none.
describe('the looks the answer asks for', () => {
  it("include another Plan's, while the first Plan is on screen", async () => {
    const asked: Asked = { fits: 0, centres: [] };
    await render(asked);

    expect(
      titled(
        drawingOf(MEAL_ANSWER, 0).things.map(({ look }) => look),
        '12:18 민수와 만남',
      ),
    ).toBe(false);
    expect(titled(jest.mocked(useMarkerImages).mock.lastCall?.[0] ?? [], '12:18 민수와 만남')).toBe(true);
  });
});
