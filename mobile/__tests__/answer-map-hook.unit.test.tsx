/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { renderHook } from '@testing-library/react-native';
import { createRef } from 'react';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import type { LatLng } from '@/api/types';
import type { AnswerLabel } from '@/design-system';
import { drawingOf } from '@/features/assistant/answer-marks';
import { NO_STANDINGS } from '@/features/assistant/invited-friends';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { inView, type MapCamera, type MapHandle, type MarkerLook } from '@/map';
import type * as MarkerImages from '@/map/marker-images';
import { useMarkerImages } from '@/map/marker-images';
import type { Room } from '@/screens/main/layout';
import { type AnswerMap, useAnswerMap } from '@/screens/main/use-answer-map';
import type { MainMap } from '@/screens/main/use-main-map';

jest.mock('@/map/marker-images', () => {
  const actual = jest.requireActual<typeof MarkerImages>('@/map/marker-images');
  return { ...actual, useMarkerImages: jest.fn(actual.useMarkerImages) };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: (): object => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// The emulator's numbers: a stage of 411 by 914 under no status bar, and a card of 274. The pill takes 100 at the top
// and the card 274 at the bottom, each with the 8 of ticket 08's area and the room the marks there need: for the first
// Plan 24 above (자하연식당 2층's label is at its left) and 66 below (the pick's two lines under 302동, 18 + 2 + 46), so
// the area is from 132 to 566; for the third Plan 24 and 24 (302동's labels are at its sides). A campus map of that
// view goes no further out than zoom 15.26 (see `answer-camera.unit.test.ts`).
const SIZE = { width: 411, height: 914 };
const ROOM: Room = { stage: SIZE, cardHeight: null, answerHeight: 274, tutorialStart: false, interestsHint: false };
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
  source: null,
  answer: null,
  plan: null,
  index: 0,
  browse: nothing,
  show: nothing,
  basisOpen: false,
  toggleBasis: nothing,
  adding: false,
  setAdding: nothing,
  recalculating: false,
  change: nothing,
  ghost: null,
  undo: nothing,
};

function shownAt(index: number): ShownAnswer {
  return { ...NO_ANSWER, source: MEAL_ANSWER, answer: MEAL_ANSWER, plan: MEAL_ANSWER.plans[index] ?? null, index };
}

interface Given {
  shown: ShownAnswer;
  room: Room;
  fitZoom: number | null;
}

const FIRST: Given = { shown: shownAt(0), room: ROOM, fitZoom: FIT_ZOOM };

// No Plan made into a Quest.
const NOT_INVITED = { sending: false, made: null, standings: NO_STANDINGS };

async function render(asked: Asked, given: Given = FIRST): Promise<(next: Given) => Promise<void>> {
  const { rerender } = await renderHook(
    ({ shown, room, fitZoom }: Given) =>
      useAnswerMap(shown, mapOf(fitZoom, asked), room, { avatars: [], cards: [] }, NOT_INVITED),
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
// at the lowest zoom every point is 425.7 high and the Plans' own points 370.8 (see `answer-camera.unit.test.ts`).
// The first Plan's area of 434 holds every point; the third Plan's under a card of 380, from 132 to 502, not even its
// own.
describe("the answer's camera", () => {
  it('goes in one move to the fit of every point of the first Plan, and asks the map for no fit', async () => {
    const asked: Asked = { fits: 0, cameras: [] };
    await render(asked);

    expect(asked.fits).toBe(0);
    expect(asked.cameras).toHaveLength(1);
    const { top, bottom } = spanIn(drawingOf(MEAL_ANSWER, 0).points, asked.cameras[0]);
    // 132 and 566 with the 8 of ticket 08's area at the top and at the bottom.
    expect(top).toBeCloseTo(132, 0);
    expect(bottom).toBeCloseTo(566, 0);
  });

  it('moves again for another Plan, and when the card grows', async () => {
    const asked: Asked = { fits: 0, cameras: [] };
    const rerender = await render(asked);

    await rerender({ ...FIRST, shown: shownAt(2) });
    expect(asked.cameras).toHaveLength(2);

    await rerender({ ...FIRST, shown: shownAt(2), room: { ...ROOM, answerHeight: 380 } });
    expect(asked.cameras).toHaveLength(3);
    // With the 8 of ticket 08's area, the area from 132 to 502 is 370 high, less than the third Plan's own 370.8: its
    // north end, by its pick 학생회관, comes to 132, and its middle to 132 + 185.4 = 317.4.
    const { top, bottom } = spanIn(drawingOf(MEAL_ANSWER, 2).own, asked.cameras[2]);
    expect((top + bottom) / 2).toBeCloseTo(317.4, 0);
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

// The label of the mark the hook hands the map under that name, null for a mark without one.
function labelOf(drawn: AnswerMap | null, name: string): AnswerLabel | null | undefined {
  const look = drawn?.contents.markers.find((marker) => marker.name === name)?.image.view;
  return look?.kind === 'answer' ? look.label : undefined;
}

async function drawnIn(room: Room): Promise<AnswerMap | null> {
  const asked: Asked = { fits: 0, cameras: [] };
  const { result } = await renderHook(() =>
    useAnswerMap(shownAt(0), mapOf(FIT_ZOOM, asked), room, { avatars: [], cards: [] }, NOT_INVITED),
  );
  return result.current;
}

// Partitions: the first Plan under the card of 406 measured on the emulator, at whose camera 학생회관 lies under the
// pill; the same before the stage is laid out, with the sides chosen in metres. Expected values: the worked numbers
// of `answer-labels.unit.test.ts` at that camera, where the pill also ends at 100 (0 + 52 + 48 here), and the stored
// answer's sides in metres (`answer-marks.unit.test.ts`).
describe('the labels the answer draws', () => {
  it("leaves out 학생회관식당's label, under the pill at the camera, and keeps the pick's under 302동", async () => {
    const drawn = await drawnIn({ ...ROOM, answerHeight: 406 });

    expect(labelOf(drawn, '후보 3 · 학생회관식당')).toBeNull();
    expect(labelOf(drawn, '302동식당 · 12:15 점심')).toMatchObject({ side: 'below' });
  });

  it("keeps 학생회관식당's label at its right while the stage is not laid out", async () => {
    const drawn = await drawnIn({ ...ROOM, stage: null, answerHeight: 406 });

    expect(labelOf(drawn, '후보 3 · 학생회관식당')).toMatchObject({ side: 'right' });
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
