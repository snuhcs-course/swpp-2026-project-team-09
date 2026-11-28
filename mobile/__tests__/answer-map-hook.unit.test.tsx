/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { renderHook } from '@testing-library/react-native';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import type { LatLng } from '@/api/types';
import type { AnswerLabel } from '@/design-system';
import { drawingOf } from '@/features/assistant/answer-marks';
import { NO_ANSWER } from './support/no-answer';
import { inView, type MapCamera, type MarkerLook } from '@/map';
import type * as MarkerImages from '@/map/marker-images';
import { useMarkerImages } from '@/map/marker-images';
import type { Room } from '@/screens/main/layout';
import { type AnswerMap, useAnswerMap } from '@/screens/main/use-answer-map';
import { placeMoved, withScene } from './support/answer-view';
import { FIRST, FIT_ZOOM, NOT_INVITED, render, ROOM, shownAt, SIZE } from './support/answer-map-hook';
import { type Asked, mapOf } from './support/main-map-stand-in';

jest.mock('@/map/marker-images', () => {
  const actual = jest.requireActual<typeof MarkerImages>('@/map/marker-images');
  return { ...actual, useMarkerImages: jest.fn(actual.useMarkerImages) };
});
// The walking route service is no part of these hooks' units: an answer's walks keep their straight lines (P15
// ticket 56 tests the walks).
const mockWays: { current: object } = { current: { paths: new Map(), legs: [] } };
jest.mock('@/screens/main/use-answer-walks', () => {
  const none = new Map();
  return {
    useAnswerWalks: (lines: readonly unknown[]): readonly unknown[] => lines,
    useWalkPaths: (): ReadonlyMap<string, unknown> => none,
    useMealWays: (): object => mockWays.current,
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: (): object => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

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
// The first Plan's area holds every point; the third Plan's under a card of 380, from 32 to 502, holds its own. The
// top is the stage's, 0, with nothing over it (the way back is in the card, P04 ticket 52), and the 8 of ticket 08's
// area with 24 for the marks.
describe("the answer's camera", () => {
  it('goes in one move to the fit of every point of the first Plan, and asks the map for no fit', async () => {
    const asked: Asked = { fits: 0, cameras: [] };
    await render(asked);

    expect(asked.fits).toBe(0);
    expect(asked.cameras).toHaveLength(1);
    const { top, bottom } = spanIn(drawingOf(MEAL_ANSWER, 0).points, asked.cameras[0]);
    // 32 and 566 with the 8 of ticket 08's area at the top and at the bottom.
    expect(top).toBeCloseTo(32, 0);
    expect(bottom).toBeCloseTo(566, 0);
  });

  it('moves again for another Plan, and when the card grows', async () => {
    const asked: Asked = { fits: 0, cameras: [] };
    const rerender = await render(asked);

    await rerender({ ...FIRST, shown: shownAt(2) });
    expect(asked.cameras).toHaveLength(2);

    await rerender({ ...FIRST, shown: shownAt(2), room: { ...ROOM, answerHeight: 380 } });
    expect(asked.cameras).toHaveLength(3);
    // The area from 32 to 502 is 470 high, more than the Plan's own 370.85, so they are fitted inside it, closer in.
    const { top, bottom } = spanIn(drawingOf(MEAL_ANSWER, 2).own, asked.cameras[2]);
    expect({ inside: top >= 32 && bottom <= 502 }).toEqual({ inside: true });
    expect(bottom - top).toBeGreaterThan(370.85);
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
// Partitions: a walk's path comes back after the answer is drawn.
describe("the answer's camera while the walks' paths come", () => {
  it("moves nothing when a walk's path comes back (PR 497's review)", async () => {
    const asked: Asked = { fits: 0, cameras: [] };
    const rerender = await render(asked);
    mockWays.current = { paths: new Map([['answer:route:0', [{ latitude: 37.455, longitude: 126.955 }]]]), legs: [] };
    await rerender(FIRST);
    expect(asked.cameras).toHaveLength(1);
  });
});

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

async function drawnIn(room: Room, shown = shownAt(0), asked?: Asked): Promise<AnswerMap | null> {
  const map = mapOf(FIT_ZOOM, asked ?? { fits: 0, cameras: [] });
  const { result } = await renderHook(() => useAnswerMap(shown, map, room, { avatars: [], cards: [] }, NOT_INVITED));
  return result.current;
}

// Partitions: the first Plan under the card of 406 measured on the emulator, at whose camera 자하연식당 2층 lies under
// the pill; the same before the stage is laid out, with the sides chosen in metres. Expected values: the worked
// numbers of `answer-labels.unit.test.ts` at that camera, where the top ends at 96 (0 + 52 + 44 here), and the
// stored answer's sides in metres (`answer-marks.unit.test.ts`).
describe('the labels the answer draws', () => {
  it("leaves out 자하연식당 2층's label, under the pill at the camera, and keeps the pick's under 302동", async () => {
    const drawn = await drawnIn({ ...ROOM, answerHeight: 406 });

    expect(labelOf(drawn, '후보 5 · 자하연식당 2층 · 12:35')).toBeNull();
    expect(labelOf(drawn, '302동식당 · 12:15 점심')).toMatchObject({ side: 'below' });
  });

  it("keeps 자하연식당 2층's label at its left while the stage is not laid out", async () => {
    const drawn = await drawnIn({ ...ROOM, stage: null, answerHeight: 406 });

    expect(labelOf(drawn, '후보 5 · 자하연식당 2층 · 12:35')).toMatchObject({ side: 'left' });
  });

  it("lets the map go out to Kakao's level 14, a quarter of a level clear of its 14.515 on the emulator", async () => {
    const drawn = await drawnIn(ROOM);

    expect(drawn).toMatchObject({ nativeMinLevel: 14 });
    expect(drawn?.outerZoom).toBeCloseTo(14.765, 6);
  });
});

// The first Plan under the card of 406 with 3식당 200 metres south of 302동, the bottom-most of every point. The room
// below every point is 24: the pick's two lines need 66 − 200 / 4.5 = 21.6, 3식당's label at its left 18. Below the
// Plan's own points, 302동 is the bottom-most, and the pick's two lines need 66. At the lowest zoom, 15.2601, those
// points are 370.85 high, and the area leaves them 32 to 914 − 406 − 8 − 66 = 434, 402 high, with nothing over the
// map's top (the way back is in the card, P04 ticket 52): the camera stays at the lowest zoom, where the pick's lines
// stay under 302동 and 3식당's symbol box clear of them.
describe("the room the camera leaves when it fits the Plan's own points alone", () => {
  it("keeps the pick's two lines under 302동 with a candidate 200 metres further south", async () => {
    // Changed from the stored copy: 3식당 stands 200 metres (0.0017966°) south of 302동, its longitude kept.
    const south = { latitude: 37.44887 - 200 / 111_320, longitude: 126.94851 };
    const answer = withScene(MEAL_ANSWER, 0, placeMoved('3식당', south));
    const asked: Asked = { fits: 0, cameras: [] };

    const drawn = await drawnIn({ ...ROOM, answerHeight: 406 }, { ...shownAt(0), answer, source: answer }, asked);

    expect(asked.cameras[0]?.zoom).toBeCloseTo(15.2601, 3);
    expect(labelOf(drawn, '302동식당 · 12:15 점심')).toMatchObject({ side: 'below' });
  });
});

function titled(looks: readonly MarkerLook[], title: string): boolean {
  return looks.some((look) => look.kind === 'answer' && look.label?.title === title);
}

// Partitions: a look that only another Plan than the one on screen draws. The third Plan's flag "12:18 민수와 만남"
// stands at its Merging Point; the first Plan has none.
describe('the looks the answer asks for', () => {
  // Asked for later than the looks on screen, so that the stage makes those first (P04 ticket 81).
  it("include another Plan's, while the first Plan is on screen, asked for later", async () => {
    const asked: Asked = { fits: 0, cameras: [] };
    await render(asked);

    expect(
      titled(
        drawingOf(MEAL_ANSWER, 0).things.map(({ look }) => look),
        '12:18 민수와 만남',
      ),
    ).toBe(false);
    const [now = [], later = []] = jest.mocked(useMarkerImages).mock.lastCall ?? [];
    expect(titled(now, '12:18 민수와 만남')).toBe(false);
    expect(titled(later, '12:18 민수와 만남')).toBe(true);
  });

  // P04 ticket 88: the ring that spread from a pick just chosen is gone, and so are its pictures.
  it('hold no pick with a ring or a pop, on arrival or after another place is chosen', async () => {
    const rerender = await render({ fits: 0, cameras: [] });
    await rerender({ ...FIRST, shown: shownAt(2) });

    const asked: MarkerLook[] = jest
      .mocked(useMarkerImages)
      .mock.calls.flatMap(([now, later]) => now.concat(later ?? []));
    const ringed = asked.filter(
      (look) =>
        look.kind === 'answer' && look.symbol?.type === 'dot' && ('ring' in look.symbol || 'pop' in look.symbol),
    );
    expect(asked.length).toBeGreaterThan(0);
    expect(ringed).toEqual([]);
  });
});
