/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import type { LatLng } from '@/api/types';
import { correctedCentre, type ViewArea } from '@/features/assistant/answer-camera';
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

// Partitions: every point inside the area; points outside with the Plan's own box longer than the area, the pick at
// its south end, at its north end, and no pick; points outside with the own box inside; a shift under one point.
// The worked numbers, at zoom 15.515 (a world of 256 × 2^15.515 = 11,987,272 points around):
// - the first and the third Plan stand at 301동 (37.45016, 126.95259), 302동 (37.44887, 126.95265), and 24동
//   (37.45942, 126.94989), the third with its pick at 학생회관 (37.45932, 126.95058): their own box is 0.01055° of
//   latitude, 0.01055 / 360 × 11,987,272 / cos(37.454°) = 442.5 points high, and 0.00276° of longitude, 91.9 wide;
// - with the other candidates, up to 자하연식당 2층 at 37.46098, the box is 508.0 high and 137.9 wide;
// - the area is 584 − 156 = 428 high and 347 − 64 = 283 wide.
describe('where the camera goes when the answer does not fit', () => {
  it('stays when every point is inside the area: at zoom 15, the whole box is 508.0 / 2^0.515 = 355.5 high', () => {
    const drawing = drawingOf(MEAL_ANSWER, 0);

    expect(correctedCentre(drawing, restingOver(drawing.points, 15), SIZE, AREA)).toBeNull();
  });

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

  it('centres the own box when there is no pick, even when it is longer than the area', () => {
    // Changed from the stored copy: the pick taken away, to see the rule without one.
    const drawing = { ...drawingOf(MEAL_ANSWER, 0), pick: null };
    const camera = restingOver(drawing.points, FLOOR);

    const box = boxIn(drawing.own, moved(camera, correctedCentre(drawing, camera, SIZE, AREA)));

    // 442.5 high, centred on 370: from 148.75 to 591.25, over both edges by 7.25.
    expect(box.top).toBeCloseTo(370 - 442.5 / 2, 0);
    expect((box.top + box.bottom) / 2).toBeCloseTo(MIDDLE.y, 3);
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
