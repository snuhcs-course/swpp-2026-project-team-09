/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { STUDY_LOOKUP } from '@/api/mock/data/study-lookup';
import type { Lookup } from '@/api/lookup-types';
import type { AnswerDrawing } from '@/features/assistant/answer-drawing';
import {
  AREA_LINE_ID,
  areaLine,
  awayPlaceOf,
  oneMarkPerBuilding,
  studyDrawing,
  studyScene,
  viewportOf,
  withAwaySeats,
} from '@/features/assistant/study-area';

// "이 근처" (P02 ticket 23): the visible area a request sends, and the drawing of a `study` Lookup over it.

const SHINYANG = { latitude: 37.4552, longitude: 126.95206 };
const AREA = { south: 37.4541, west: 126.949, north: 37.4563, east: 126.9551 };
const KWANJEONG = STUDY_LOOKUP.scene.flags.find(({ role }) => role === 'away')?.placeId ?? '';

// Partitions: a tall view under a status bar at one zoom, and a wide view without one at another. Expected values:
// Web Mercator worked out by hand from the camera's centre, the view's half width and half height in points, and a
// world of 256 × 2^zoom points.
describe('the visible area of a view', () => {
  it('is what a tall view leaves under the status bar at zoom 16', () => {
    const area = viewportOf({ centre: SHINYANG, zoom: 16 }, { width: 360, height: 800 }, 24);

    expect(area.south).toBeCloseTo(37.4483862, 7);
    expect(area.west).toBeCloseTo(126.9481976, 7);
    expect(area.north).toBeCloseTo(37.4616044, 7);
    expect(area.east).toBeCloseTo(126.9559224, 7);
  });

  it('is the whole of a wide view at zoom 17.5', () => {
    const area = viewportOf({ centre: SHINYANG, zoom: 17.5 }, { width: 800, height: 360 }, 0);

    expect(area.south).toBeCloseTo(37.454116, 6);
    expect(area.west).toBeCloseTo(126.9490254, 7);
    expect(area.north).toBeCloseTo(37.456284, 6);
    expect(area.east).toBeCloseTo(126.9550946, 7);
  });
});

describe('the outline of the area', () => {
  it('goes round its four corners and closes', () => {
    expect(areaLine(AREA).points).toEqual([
      { latitude: 37.4563, longitude: 126.949 },
      { latitude: 37.4563, longitude: 126.9551 },
      { latitude: 37.4541, longitude: 126.9551 },
      { latitude: 37.4541, longitude: 126.949 },
      { latitude: 37.4563, longitude: 126.949 },
    ]);
  });
});

// Partitions: seats for the flag's Place, for another Place, and none. Expected values: board a9's flag words.
describe('the free seats on the flag to 관정', () => {
  it('are added to the away flag that points to the Place read', () => {
    const scene = withAwaySeats(STUDY_LOOKUP.scene, { placeId: KWANJEONG, free: 213 });

    expect(scene.flags.map(({ text }) => text)).toEqual(['걸어서 8분 · 12:52까지 34분', '↑ 관정 · 빈 자리 213석']);
  });

  it('leave the flag of another Place, and the scene without seats, as they are', () => {
    expect(withAwaySeats(STUDY_LOOKUP.scene, { placeId: 'another', free: 213 }).flags).toEqual(
      STUDY_LOOKUP.scene.flags,
    );
    expect(withAwaySeats(STUDY_LOOKUP.scene, null)).toBe(STUDY_LOOKUP.scene);
  });

  it('are read for the Place of a study Lookup only', () => {
    const way: Lookup = { ...STUDY_LOOKUP, kind: 'way' };
    const noFlag: Lookup = { ...STUDY_LOOKUP, scene: { ...STUDY_LOOKUP.scene, flags: [] } };

    expect(awayPlaceOf(STUDY_LOOKUP)).toBe(KWANJEONG);
    expect(awayPlaceOf(way)).toBeNull();
    expect(awayPlaceOf(noFlag)).toBeNull();
    expect(awayPlaceOf(null)).toBeNull();
  });
});

const DRAWING: AnswerDrawing = {
  things: [],
  lines: [{ id: 'answer:route:0', points: [SHINYANG, SHINYANG], style: { color: '#000000', width: 5 } }],
  points: [SHINYANG],
  own: [SHINYANG],
  pick: SHINYANG,
  userIds: [],
};

// Partitions: a study Lookup with an area, one without, and another kind. Expected values: the decision that the area
// lies under the route and that the camera fits nothing.
describe("a study Lookup's drawing", () => {
  it('outlines the area under the route and gives the camera no point to fit', () => {
    const drawn = studyDrawing(DRAWING, STUDY_LOOKUP, AREA);

    expect(drawn.lines.map(({ id }) => id)).toEqual([AREA_LINE_ID, 'answer:route:0']);
    expect(drawn.points).toEqual([]);
  });

  it('draws no outline without an area sent', () => {
    expect(studyDrawing(DRAWING, STUDY_LOOKUP, null).lines.map(({ id }) => id)).toEqual(['answer:route:0']);
  });

  it('leaves the drawing of another Lookup as it is', () => {
    expect(studyDrawing(DRAWING, { ...STUDY_LOOKUP, kind: 'way' }, AREA)).toBe(DRAWING);
  });
});

// Partitions: one room a building (board a9), and three at one building with `any`. Expected values: the decision that
// a building's rooms are one faded mark named after the first, the others counted.
describe('the rooms open only to others', () => {
  const dropped = STUDY_LOOKUP.scene.places.filter(({ role }) => role === 'dropped');
  const [first] = dropped;
  if (first === undefined) {
    throw new Error('Board a9 has faded rooms');
  }
  const more = [
    { ...first, tag: '전기공학 열람실 · 전기·정보공학부' },
    { ...first, tag: '컴퓨터공학 세미나실 · 컴퓨터공학부' },
  ];

  it('stay one mark a building when each building has one, as on board a9', () => {
    expect(oneMarkPerBuilding(STUDY_LOOKUP.scene).places).toEqual(STUDY_LOOKUP.scene.places);
  });

  it('of one building are one mark, named after the first with the others counted', () => {
    const scene = { ...STUDY_LOOKUP.scene, places: [...STUDY_LOOKUP.scene.places, ...more] };

    const faded = oneMarkPerBuilding(scene).places.filter(({ role }) => role === 'dropped');

    expect(faded.map(({ place, tag }) => `${place.label}: ${String(tag)}`)).toEqual([
      `${first.place.label}: ${String(first.tag)} 외 2`,
      ...dropped.slice(1).map(({ place, tag }) => `${place.label}: ${String(tag)}`),
    ]);
  });

  it('are merged only in a study Lookup', () => {
    const scene = { ...STUDY_LOOKUP.scene, places: [...STUDY_LOOKUP.scene.places, ...more] };

    expect(studyScene({ ...STUDY_LOOKUP, kind: 'way', scene }, null)).toBe(scene);
    expect(studyScene({ ...STUDY_LOOKUP, scene }, null).places).toHaveLength(scene.places.length - 2);
  });
});
