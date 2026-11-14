/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { renderHook } from '@testing-library/react-native';
import { createRef } from 'react';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import type { LatLng } from '@/api/types';
import { drawingOf } from '@/features/assistant/answer-marks';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { inView, type MapCamera, type MapHandle, type MarkerLook } from '@/map';
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

// The emulator's numbers: a stage of 411 by 914 under no status bar, and a card of 274. The pill and the room for a
// label take 156 at the top, and the card with its room 346 at the bottom: the area is from 156 to 568. A campus map
// of that view goes no further out than zoom 15.26 (see `answer-camera.unit.test.ts`).
const SIZE = { width: 411, height: 914 };
const ROOM: Room = { stage: SIZE, cardHeight: null, answerHeight: 274, tutorialStart: false };
const FIT_ZOOM = 15.26;

function nothing(): void {
  // A move the test does not follow.
}

interface Asked {
  fits: number;
  cameras: MapCamera[];
}

// A stand-in for the main screen's map, which records the fits and the moves it is asked.
function mapOf(fitZoom: number | null, asked: Asked): MainMap {
  return {
    ref: createRef<MapHandle>(),
    onCameraIdle: nothing,
    onFitZoom: nothing,
    camera: null,
    fitZoom,
    detail: 'overview',
    zoomBy: nothing,
    goTo: nothing,
    showCampus: nothing,
    fitTo: nothing,
    fitAnswer: (): void => {
      asked.fits += 1;
    },
    moveTo: (camera): void => {
      asked.cameras.push(camera);
    },
  };
}

const NO_ANSWER: ShownAnswer = {
  answer: null,
  plan: null,
  index: 0,
  browse: nothing,
  show: nothing,
  basisOpen: false,
  toggleBasis: nothing,
};

function shownAt(index: number): ShownAnswer {
  return { ...NO_ANSWER, answer: MEAL_ANSWER, plan: MEAL_ANSWER.plans[index] ?? null, index };
}

interface Given {
  shown: ShownAnswer;
  room: Room;
  fitZoom: number | null;
}

const FIRST: Given = { shown: shownAt(0), room: ROOM, fitZoom: FIT_ZOOM };

async function render(asked: Asked, given: Given = FIRST): Promise<(next: Given) => Promise<void>> {
  const { rerender } = await renderHook(
    ({ shown, room, fitZoom }: Given) => useAnswerMap(shown, mapOf(fitZoom, asked), room, { avatars: [], cards: [] }),
    { initialProps: given },
  );
  return async (next): Promise<void> => {
    await rerender(next);
  };
}

// From the top of the box around the points to its bottom, in the view of a camera.
function spanIn(points: readonly LatLng[], camera: MapCamera | undefined): { top: number; bottom: number } {
  if (camera === undefined) {
    throw new Error('No camera was asked for');
  }
  const ys = points.map((point) => inView(point, camera, SIZE).y);
  return { top: Math.min(...ys), bottom: Math.max(...ys) };
}

// Partitions: the answer comes; the Plan on screen changes; the card grows; the answer is closed. Expected values:
// the Plans' own points are 370.8 high at the lowest zoom (see `answer-camera.unit.test.ts`), which the area of 412
// holds and an area of 306, under a card of 380, does not.
describe("the answer's camera", () => {
  it("goes in one move to where the Plan's own points are centred, and asks the map for no fit", async () => {
    const asked: Asked = { fits: 0, cameras: [] };
    await render(asked);

    expect(asked.fits).toBe(0);
    expect(asked.cameras).toHaveLength(1);
    const { top, bottom } = spanIn(drawingOf(MEAL_ANSWER, 0).own, asked.cameras[0]);
    expect((top + bottom) / 2).toBeCloseTo(362, 0);
  });

  it('moves again for another Plan, and when the card grows', async () => {
    const asked: Asked = { fits: 0, cameras: [] };
    const rerender = await render(asked);

    await rerender({ ...FIRST, shown: shownAt(2) });
    expect(asked.cameras).toHaveLength(2);

    await rerender({ ...FIRST, shown: shownAt(2), room: { ...ROOM, answerHeight: 380 } });
    expect(asked.cameras).toHaveLength(3);
    // The third Plan's pick is near its north end, which stays at the area's top.
    expect(spanIn(drawingOf(MEAL_ANSWER, 2).own, asked.cameras[2]).top).toBeCloseTo(156, 0);
  });

  it('moves nothing when the answer is closed', async () => {
    const asked: Asked = { fits: 0, cameras: [] };
    const rerender = await render(asked);

    await rerender({ ...FIRST, shown: NO_ANSWER });

    expect(asked.cameras).toHaveLength(1);
    expect(asked.fits).toBe(0);
  });
});

// Partitions: the stage is not laid out; the map has not told its fit zoom; both come.
describe("the answer's camera before the view is known", () => {
  it('asks the map to fit the points while the stage is not laid out', async () => {
    const asked: Asked = { fits: 0, cameras: [] };
    await render(asked, { ...FIRST, room: { ...ROOM, stage: null } });

    expect(asked.fits).toBe(1);
    expect(asked.cameras).toEqual([]);
  });

  it('asks the map to fit until it has told its fit zoom, and then moves to the camera worked out', async () => {
    const asked: Asked = { fits: 0, cameras: [] };
    const rerender = await render(asked, { ...FIRST, fitZoom: null });
    expect(asked.fits).toBe(1);

    await rerender(FIRST);

    expect(asked.fits).toBe(1);
    expect(asked.cameras).toHaveLength(1);
  });
});

function titled(looks: readonly MarkerLook[], title: string): boolean {
  return looks.some((look) => look.kind === 'answer' && look.label?.title === title);
}

// Partitions: a look that only another Plan than the one on screen draws. The third Plan's flag "12:18 민수와 만남"
// stands at its Merging Point; the first Plan has none.
describe('the looks the answer asks for', () => {
  it("include another Plan's, while the first Plan is on screen", async () => {
    const asked: Asked = { fits: 0, cameras: [] };
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
