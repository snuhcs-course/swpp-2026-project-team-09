/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import type { LatLng } from '@/api/types';
import { answerCamera, correctedCentre, type ViewArea } from '@/features/assistant/answer-camera';
import { drawingOf } from '@/features/assistant/answer-marks';
import { inView, type MapCamera, project, unproject } from '@/map';

// The emulator's numbers: a view of 411 by 914, the pill and the label room take 156 at the top, the card and the
// label room 330 at the bottom, and 64 at each side. Kakao's floor holds the camera at zoom 15.515.
const SIZE = { width: 411, height: 914 };
const AREA: ViewArea = { top: 156, right: 411 - 64, bottom: 914 - 330, left: 64 };
const FLOOR = 15.515;
// The middle of the area is (205.5, 370); the middle of the view is (205.5, 457).
const MIDDLE = { x: 205.5, y: 370 };

// The camera at `zoom` that brings the middle of the box around `points` to the middle of the area: where a fit of
// those points rests when the map lets it come no further out.
function restingOver(points: readonly LatLng[], zoom: number): MapCamera {
  const projected = points.map((point) => project(point, zoom));
  const xs = projected.map(({ x }) => x);
  const ys = projected.map(({ y }) => y);
  const middle = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  return { centre: unproject({ x: middle.x, y: middle.y + SIZE.height / 2 - MIDDLE.y }, zoom), zoom };
}

// The box around the points in the view of a camera.
function boxIn(points: readonly LatLng[], camera: MapCamera): { top: number; bottom: number; middleX: number } {
  const placed = points.map((point) => inView(point, camera, SIZE));
  const xs = placed.map(({ x }) => x);
  const ys = placed.map(({ y }) => y);
  return { top: Math.min(...ys), bottom: Math.max(...ys), middleX: (Math.min(...xs) + Math.max(...xs)) / 2 };
}

function moved(camera: MapCamera, centre: LatLng | null): MapCamera {
  if (centre === null) {
    throw new Error('The camera was not moved');
  }
  return { centre, zoom: camera.zoom };
}

// The worked numbers, at zoom 15.515 (a world of 256 × 2^15.515 = 11,987,272 points around):
// - the first and the third Plan stand at 301동 (37.45016, 126.95259), 302동 (37.44887, 126.95265), and 24동
//   (37.45942, 126.94989), the third with its pick at 학생회관 (37.45932, 126.95058): their own box is 0.01055° of
//   latitude, 0.01055 / 360 × 11,987,272 / cos(37.454°) = 442.5 points high, and 0.00276° of longitude, 91.9 wide;
// - with the other candidates, up to 자하연식당 2층 at 37.46098, the box is 508.0 high and 137.9 wide;
// - the area is 584 − 156 = 428 high and 347 − 64 = 283 wide.
// Partitions: every point inside the area; a shift under one point.
describe('where the camera stays', () => {
  it('stays when every point is inside the area: at zoom 15, the whole box is 508.0 / 2^0.515 = 355.5 high', () => {
    const drawing = drawingOf(MEAL_ANSWER, 0);

    expect(correctedCentre(drawing, restingOver(drawing.points, 15), SIZE, AREA)).toBeNull();
  });

  it('stays when the shift would be under one point', () => {
    const drawing = drawingOf(MEAL_ANSWER, 0);
    const camera = restingOver(drawing.points, FLOOR);
    const corrected = moved(camera, correctedCentre(drawing, camera, SIZE, AREA));
    // Half a point north of where the rule puts the camera: the box would move by half a point.
    const at = project(corrected.centre, FLOOR);
    const near = { centre: unproject({ x: at.x, y: at.y - 0.5 }, FLOOR), zoom: FLOOR };

    expect(correctedCentre(drawing, near, SIZE, AREA)).toBeNull();
  });
});

// Partitions: points outside with the Plan's own box longer than the area, the pick at its south end and at its north
// end; points outside with the own box inside.
describe('where the camera goes when the answer does not fit', () => {
  it("lays the first Plan's south edge, where its pick is, on the area's bottom, and centres it across", () => {
    const drawing = drawingOf(MEAL_ANSWER, 0);
    const camera = restingOver(drawing.points, FLOOR);

    const box = boxIn(drawing.own, moved(camera, correctedCentre(drawing, camera, SIZE, AREA)));

    // 442.5 > 428: the south edge comes to 584; 91.9 < 283: the middle comes to 205.5.
    expect(box.bottom).toBeCloseTo(584, 3);
    expect(box.top).toBeCloseTo(584 - 442.5, 0);
    expect(box.middleX).toBeCloseTo(MIDDLE.x, 3);
  });

  it("lays the third Plan's north edge on the area's top, its pick 학생회관 being near the north end", () => {
    const drawing = drawingOf(MEAL_ANSWER, 2);
    const camera = restingOver(drawing.points, FLOOR);

    const box = boxIn(drawing.own, moved(camera, correctedCentre(drawing, camera, SIZE, AREA)));

    // 24동 at 37.45942 is the north edge; 학생회관 is 0.0001° south of it and 0.01045° north of 302동.
    expect(box.top).toBeCloseTo(156, 3);
    expect(box.middleX).toBeCloseTo(MIDDLE.x, 3);
  });

  it('centres the own box when it fits while a far candidate does not', () => {
    const drawing = drawingOf(MEAL_ANSWER, 0);
    // At zoom 15.4 the own box is 442.5 / 2^0.115 = 408.6 high, inside 428; the whole box 469.0, outside.
    const camera = restingOver(drawing.points, 15.4);

    const box = boxIn(drawing.own, moved(camera, correctedCentre(drawing, camera, SIZE, AREA)));

    expect((box.top + box.bottom) / 2).toBeCloseTo(MIDDLE.y, 3);
    expect(box.middleX).toBeCloseTo(MIDDLE.x, 3);
  });
});

// Partitions: no pick, with the own box longer than the area.
describe('where the camera goes without a pick', () => {
  it('centres the own box when there is no pick, even when it is longer than the area', () => {
    // Changed from the stored copy: the pick taken away, to see the rule without one.
    const drawing = { ...drawingOf(MEAL_ANSWER, 0), pick: null };
    const camera = restingOver(drawing.points, FLOOR);

    const box = boxIn(drawing.own, moved(camera, correctedCentre(drawing, camera, SIZE, AREA)));

    // 442.5 high, centred on 370: from 148.75 to 591.25, over both edges by 7.25.
    expect(box.top).toBeCloseTo(370 - 442.5 / 2, 0);
    expect((box.top + box.bottom) / 2).toBeCloseTo(MIDDLE.y, 3);
  });
});

// The camera worked out before the move, on a campus map of the emulator's view. The lowest zoom of a campus map is
// the one at which the view fits inside the campus rectangle: for 914 points of height over its 0.026° of latitude,
// 15.26. There the box of every point is 508.0 / 2^0.255 = 425.7 high and the Plans' own box 442.5 / 2^0.255 = 370.8.
// The padding is the screen's: 156 at the top, the card and 72 at the bottom, and 64 at each side.
const LOWEST = 15.26;

function paddingOver(card: number): { top: number; right: number; bottom: number; left: number } {
  return { top: 156, right: 64, bottom: card + 72, left: 64 };
}

function cameraFor(planIndex: number, card: number): MapCamera {
  const camera = answerCamera(drawingOf(MEAL_ANSWER, planIndex), SIZE, paddingOver(card), 20);
  if (camera === null) {
    throw new Error('The drawing has no camera');
  }
  return camera;
}

// Partitions: every point fits above the lowest zoom; not every point fits at the lowest zoom while the Plan's own
// do; the Plan's own do not fit either, with the pick at the south end and near the north end.
describe('the camera worked out for an answer', () => {
  it('is the fit of every point when the area has room: under a card of 120 the area is 566 high', () => {
    const camera = cameraFor(0, 120);

    const box = boxIn(drawingOf(MEAL_ANSWER, 0).points, camera);
    // 425.7 at the lowest zoom fits 566, so the camera comes closer until the box is 566 high, centred on 439.
    expect(camera.zoom).toBeGreaterThan(LOWEST);
    expect(box.top).toBeCloseTo(156, 0);
    expect(box.bottom).toBeCloseTo(914 - 192, 0);
  });

  it("centres the Plan's own points at the lowest zoom when only they fit: under the emulator's card of 274", () => {
    const camera = cameraFor(0, 274);

    const box = boxIn(drawingOf(MEAL_ANSWER, 0).own, camera);
    // The area is 568 − 156 = 412 high: 425.7 does not fit, 370.8 does, and its middle comes to 362.
    expect(camera.zoom).toBeCloseTo(LOWEST, 2);
    expect((box.top + box.bottom) / 2).toBeCloseTo(362, 0);
  });

  it("keeps the pick's side under a tall card: the first Plan's south edge on the area's bottom", () => {
    const camera = cameraFor(0, 380);

    // The area is 462 − 156 = 306 high, less than 370.8.
    expect(camera.zoom).toBeCloseTo(LOWEST, 2);
    expect(boxIn(drawingOf(MEAL_ANSWER, 0).own, camera).bottom).toBeCloseTo(914 - 452, 0);
  });

  it("keeps the pick's side under a tall card: the third Plan's north edge on the area's top", () => {
    const camera = cameraFor(2, 380);

    expect(boxIn(drawingOf(MEAL_ANSWER, 2).own, camera).top).toBeCloseTo(156, 0);
  });
});

// Partitions: a drawing of nothing, and points so near each other that the closest zoom allowed decides.
describe('the camera worked out at its limits', () => {
  it('is none for a drawing without points', () => {
    expect(answerCamera({ points: [], own: [], pick: null }, SIZE, paddingOver(274), 20)).toBeNull();
  });

  it('comes no closer than the closest zoom given', () => {
    // Changed from the stored copy: only 301동 and 302동, 143 metres apart, which alone would fill the area at a
    // zoom far above 17.
    const { own, pick } = drawingOf(MEAL_ANSWER, 0);
    const near = own.filter(({ latitude }) => latitude < 37.451);

    expect(answerCamera({ points: near, own: near, pick }, SIZE, paddingOver(274), 17)?.zoom).toBe(17);
  });
});
