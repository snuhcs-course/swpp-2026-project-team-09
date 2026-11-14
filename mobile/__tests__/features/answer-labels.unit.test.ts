/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_FIXED_START } from '@/api/mock/data/meal-answers';
import { drawingOf } from '@/features/assistant/answer-marks';
import { NO_STANDINGS } from '@/features/assistant/invited-friends';
import { MINSU_ID, NEXT_CLASS, seen, sideOf } from '../support/answer-marks';
import { AREA, FIRST_CAMERA, positionAt, THIRD_CAMERA, viewAt, withScene } from '../support/answer-view';

// The worked numbers. A label's box: 20 from its point on its side (half the symbol box of 36 and the gap of 2), 26
// high for one line and 46 for two, centred on the point the other way; its width the padding of 8 at each side, a
// number's badge of 16 and 4, the pick's border of 2 at each side, and its words: a Hangul syllable 0.87 of the font's
// size, a space, "·", or ":" 0.29, any other letter 0.67, at 12 points, or 14 for the pick's title; rounded up. The area
// runs from 108 to 500 and from 16 to 395, and a box less than a point over it is inside.
//
// The first Plan at its camera (`FIRST_CAMERA`), at the lowest zoom 15.2601, where a degree of latitude is about 35,140
// points and one of longitude 27,902 around 37.45: 301동 at (242.3, 388.7), 302동 (244.0, 434.0), 학생회관 (186.2,
// 66.7), 3식당 (128.5, 166.9), 자하연식당 2층 (240.4, 8.3), and 24동 (167.0, 63.1).
//
// Partitions: a label of the Plan's own marks inside the area at its first side; the pick's two lines ending on the
// area's bottom and two points past it; labels of marks under the pill, which have no side left.
describe("the first Plan's labels at the emulator's camera", () => {
  const drawing = drawingOf(MEAL_ANSWER, 0, NO_STANDINGS, viewAt(FIRST_CAMERA));

  it("keeps the User's tag at the right and the candidates at 301동 and 3식당 at the left", () => {
    // "나 · 3분", 56 wide: 262.3 to 318.3, 375.7 to 401.7. "301동식당" with its badge, 92: 130.3 to 222.3.
    // "3식당", 45: 63.5 to 108.5, 153.9 to 179.9.
    expect(sideOf(drawing, 'answer:me')).toBe('right');
    expect(sideOf(drawing, 'answer:candidate:301동식당')).toBe('left');
    expect(sideOf(drawing, 'answer:candidate:3식당')).toBe('left');
  });

  it("keeps the pick's two lines under 302동, ending on the area's bottom", () => {
    // "302동식당" / "12:15 점심" with its badge and border, 105 wide and 46 high: 191.5 to 296.5, 454 to 500.
    expect(seen(drawing, 'answer:pick').label).toMatchObject({ side: 'below', line: '12:15 점심' });
  });

  it("puts the pick's two lines above 302동 when the area ends two points higher", () => {
    // Below would end at 500, 2 past 498; above runs from 368 to 414, and 301동 is 143.6 metres north, out of the
    // 120 metres a label above reaches.
    const shorter = drawingOf(MEAL_ANSWER, 0, NO_STANDINGS, viewAt(FIRST_CAMERA, { ...AREA, bottom: AREA.bottom - 2 }));

    expect(sideOf(shorter, 'answer:pick')).toBe('above');
  });

  it('leaves out the labels of 학생회관식당 and the next Class, under the pill, and still names them', () => {
    // 학생회관 at 66.7: at a side from 53.7, below from 86.7, both above 108. 24동 at 63.1: from 50.1 and 83.1.
    expect(seen(drawing, 'answer:candidate:학생회관식당')).toMatchObject({
      name: '후보 3 · 학생회관식당',
      label: null,
    });
    expect(seen(drawing, NEXT_CLASS)).toMatchObject({ name: '13:00 수업 · 24동', label: null });
  });
});

// The third Plan at its camera (`THIRD_CAMERA`): 301동 at (242.3, 457.5), 302동 (244.0, 502.9), 학생회관 (186.2,
// 135.5), 3식당 (128.5, 235.7), 자하연식당 2층 (240.4, 77.2), and 24동 (167.0, 132.0).
//
// Partitions: three labels at one point inside the area; a candidate's label pushed off three sides by the card; a
// person's label with no side left; labels near the pill inside and above it.
describe("the third Plan's labels at the emulator's camera", () => {
  const drawing = drawingOf(MEAL_ANSWER, 2, NO_STANDINGS, viewAt(THIRD_CAMERA));

  it('keeps the flag above 301동, the User at the right, and 301동식당 at the left', () => {
    // "12:18 민수와 만남", 111 wide: 186.8 to 297.8, 411.5 to 437.5. "나 · 15분", 64: 262.3 to 326.3, 444.5 to 470.5.
    expect(sideOf(drawing, 'answer:meeting:1')).toBe('above');
    expect(sideOf(drawing, 'answer:me')).toBe('right');
    expect(sideOf(drawing, 'answer:candidate:301동식당')).toBe('left');
  });

  it('puts 302동식당 above 302동, its left, right, and lower side reaching under the card', () => {
    // At a side from 489.9 to 515.9, below to 568.9, all past 500; above: 198.0 to 290.0, 456.9 to 482.9.
    expect(sideOf(drawing, 'answer:candidate:302동식당')).toBe('above');
  });

  it("leaves 민수's tag out, with no side left by the card, and still names him with it", () => {
    // "18분" at the right and at the left would reach from 489.9 to 515.9.
    expect(seen(drawing, `answer:person:${MINSU_ID}`)).toMatchObject({ name: '민수 · 18분', label: null });
  });

  it('keeps the pick, 3식당, and the next Class at their first sides, and leaves 자하연식당 2층 under the pill out', () => {
    // The pick's 94 by 46: 139.2 to 233.2, 155.5 to 201.5. "13:00 수업 · 24동", 113: 34.0 to 147.0, 119 to 145.
    // 자하연식당 2층 at 77.2: at a side from 64.2, below from 97.2.
    expect(sideOf(drawing, 'answer:pick')).toBe('below');
    expect(sideOf(drawing, 'answer:candidate:3식당')).toBe('left');
    expect(sideOf(drawing, NEXT_CLASS)).toBe('left');
    expect(seen(drawing, 'answer:candidate:자하연식당 2층').label).toBeNull();
  });
});

// The answer for a fixed start shares the third Plan's camera: the same own points and the same room for marks.
//
// Partitions: a label pushed off its first side by the left edge; long reasons at the left inside the area and above
// a point by the card.
describe("the labels of the answer for a fixed start at the emulator's camera", () => {
  const drawing = drawingOf(MEAL_ANSWER_FIXED_START, 0, NO_STANDINGS, viewAt(THIRD_CAMERA));

  it("puts 3식당's reason at its right, its left reaching past the left edge", () => {
    // "3식당 · 14분밖에 못 있어요", 152 wide: at the left from -43.5; at the right 148.5 to 300.5, 222.7 to 248.7.
    expect(sideOf(drawing, 'answer:dropped:3식당')).toBe('right');
  });

  it('keeps the long reason of 301동식당 at the left, and puts 302동식당 above its point by the card', () => {
    // "301동식당 · 5분밖에 못 있어요", 170: 52.3 to 222.3. 302동식당's, 170: above, 159.0 to 329.0, 456.9 to 482.9.
    expect(sideOf(drawing, 'answer:dropped:301동식당')).toBe('left');
    expect(sideOf(drawing, 'answer:dropped:302동식당')).toBe('above');
    expect(sideOf(drawing, 'answer:meeting:1')).toBe('above');
    expect(sideOf(drawing, 'answer:pick')).toBe('below');
  });
});

// Partitions: a flag whose first side, free of other points, reaches under the pill.
describe('a label near the pill', () => {
  it('puts a flag under its point when above it would lie under the pill', () => {
    // Changed from the stored copy: the meeting flag "12:18 민수와 만남" stands at the view's (300, 140), with no other
    // point within the 120 metres (38 points) up and 150 across (47) a label above reaches. Above, it would run from
    // 94 to 120, over 108; below, 244.5 to 355.5 and 160 to 186.
    const at = positionAt(THIRD_CAMERA, { x: 300, y: 140 });
    const answer = withScene(MEAL_ANSWER, 2, (scene) => ({
      ...scene,
      flags: scene.flags.map((flag) => (flag.role === 'meeting' ? { ...flag, at } : flag)),
    }));

    expect(sideOf(drawingOf(answer, 2, NO_STANDINGS, viewAt(THIRD_CAMERA)), 'answer:meeting:1')).toBe('below');
  });
});
