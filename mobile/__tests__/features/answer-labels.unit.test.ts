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
import {
  AREA,
  FIRST_CAMERA,
  placeMoved,
  positionAt,
  THIRD_AT_LOWEST,
  THIRD_CAMERA,
  viewAt,
  withScene,
} from '../support/answer-view';

// The worked numbers. A label's box: 20 from its point on its side (half the symbol box of 36 and the gap of 2), 26
// high for one line and 46 for two, centred on the point the other way; its width the padding of 8 at each side, a
// number's badge of 16 and 4, the pick's border of 2 at each side, and its words: a Hangul syllable 0.87 of the font's
// size, a space, "·", or ":" 0.29, any other letter 0.67, at 12 points, or 14 for the pick's title; rounded up. The area
// runs from 108 to 500 and from 16 to 395, and a box less than a point over it is inside. A symbol box is 36 square on
// its point. Labels take sides flags first, then the pick, people, the next Class, candidates, and Restaurants that do
// not fit; a side is free when its box stays inside the area and covers no other point's symbol box and no label placed
// before it.
//
// The first Plan at its camera (`FIRST_CAMERA`, zoom 14.9638, where a degree of latitude is about 28,615 points and
// one of longitude 22,720): 301동 at (235.5, 397.1), 302동 (236.9, 434.0), 학생회관 (189.8, 134.9), 3식당 (142.8,
// 216.4), 자하연식당 2층 (233.9, 87.3), and 24동 (174.1, 132.0).
//
// Partitions: the labels of the Plan's own marks and of the next Class at their first sides; a candidate's first side
// covering another point's symbol; a label under the pill with no side left; the pick's lines ending on the area's
// bottom and two points past it.
describe("the first Plan's labels at the emulator's camera", () => {
  const drawing = drawingOf(MEAL_ANSWER, 0, NO_STANDINGS, viewAt(FIRST_CAMERA));

  it("keeps the User's tag at the right, the pick's two lines below 302동, and the next Class at the left", () => {
    // "나 · 3분", 56 wide: 255.5 to 311.5, 384.1 to 410.1. "302동식당" / "12:15 점심" with its badge and border, 105
    // by 46: 184.4 to 289.4, 454 to 500. "13:00 수업 · 24동", 113: 41.1 to 154.1, 119 to 145.
    expect(sideOf(drawing, 'answer:me')).toBe('right');
    expect(seen(drawing, 'answer:pick').label).toMatchObject({ side: 'below', line: '12:15 점심' });
    expect(sideOf(drawing, NEXT_CLASS)).toBe('left');
  });

  it('puts 학생회관식당 at its right, its left covering the next Class at 24동', () => {
    // At the left, 90.8 to 169.8 and 121.9 to 147.9, over 24동's symbol box (156.1 to 192.1, 114 to 150); at the
    // right, 209.8 to 288.8.
    expect(sideOf(drawing, 'answer:candidate:학생회관식당')).toBe('right');
  });

  it('keeps the candidates at 301동 and 3식당 at the left, and leaves out 자하연식당 2층, still naming it', () => {
    // "301동식당" with its badge, 92: 123.5 to 215.5. "3식당", 45: 77.8 to 122.8. 자하연식당 2층 at 87.3: at a side from
    // 74.3, above 108; below, 107.3 to 133.3, over 학생회관's symbol box (116.9 to 152.9).
    expect(sideOf(drawing, 'answer:candidate:301동식당')).toBe('left');
    expect(sideOf(drawing, 'answer:candidate:3식당')).toBe('left');
    expect(seen(drawing, 'answer:candidate:자하연식당 2층')).toMatchObject({
      name: '후보 5 · 자하연식당 2층',
      label: null,
    });
  });

  it("leaves the pick's two lines out when the area ends two points higher, above being over the User's dot", () => {
    // Below would end at 500, 2 past 498; above, 184.4 to 289.4 and 368 to 414, it covers 301동's symbol box (217.5
    // to 253.5, 379.1 to 415.1) and the User's tag.
    const shorter = drawingOf(MEAL_ANSWER, 0, NO_STANDINGS, viewAt(FIRST_CAMERA, { ...AREA, bottom: AREA.bottom - 2 }));

    expect(seen(shorter, 'answer:pick')).toMatchObject({ name: '302동식당 · 12:15 점심', label: null });
  });
});

// The third Plan at its camera (`THIRD_CAMERA`, zoom 15.1517: a degree of latitude about 32,597 points, of longitude
// 25,883): 301동 at (239.7, 433.9), 302동 (241.2, 476.0), 학생회관 (187.6, 135.3), 3식당 (134.1, 228.2), 자하연식당
// 2층 (237.9, 81.1), and 24동 (169.8, 132.0).
//
// Partitions: three labels at one point; both people's tags kept; candidates at 302동 and near the pill.
describe("the third Plan's labels at the emulator's camera", () => {
  const drawing = drawingOf(MEAL_ANSWER, 2, NO_STANDINGS, viewAt(THIRD_CAMERA));

  it('keeps the flag above 301동, the User at the right, and 301동식당 at the left', () => {
    // "12:18 민수와 만남", 111 wide: 184.2 to 295.2, 387.9 to 413.9. "나 · 15분", 64: 259.7 to 323.7, 420.9 to 446.9.
    // "301동식당", 92: 127.7 to 219.7.
    expect(sideOf(drawing, 'answer:meeting:1')).toBe('above');
    expect(sideOf(drawing, 'answer:me')).toBe('right');
    expect(sideOf(drawing, 'answer:candidate:301동식당')).toBe('left');
  });

  it("keeps 민수's tag at the right of 302동, inside the area", () => {
    // "18분", 43 wide: 261.2 to 304.2, 463 to 489.
    expect(seen(drawing, `answer:person:${MINSU_ID}`)).toMatchObject({ name: '민수 · 18분', label: { side: 'right' } });
  });

  it("puts 302동식당 at the left of 302동, not above it over the User's dot and tag", () => {
    // "302동식당" with its badge, 92: 129.2 to 221.2, 463 to 489.
    expect(sideOf(drawing, 'answer:candidate:302동식당')).toBe('left');
  });

  it('keeps the pick, 3식당, and the next Class at their first sides, and leaves 자하연식당 2층 under the pill out', () => {
    // The pick's 94 by 46: 140.6 to 234.6, 155.3 to 201.3. "3식당": 69.1 to 114.1. "13:00 수업 · 24동": 36.8 to 149.8,
    // 119 to 145. 자하연식당 2층 at 81.1: at a side from 68.1, below from 101.1.
    expect(sideOf(drawing, 'answer:pick')).toBe('below');
    expect(sideOf(drawing, 'answer:candidate:3식당')).toBe('left');
    expect(sideOf(drawing, NEXT_CLASS)).toBe('left');
    expect(seen(drawing, 'answer:candidate:자하연식당 2층').label).toBeNull();
  });
});

// The answer for a fixed start shares the third Plan's camera: the same own points and the same room for marks.
//
// Partitions: a label pushed off its first side by the left edge; long reasons at the left inside the area.
describe("the labels of the answer for a fixed start at the emulator's camera", () => {
  const drawing = drawingOf(MEAL_ANSWER_FIXED_START, 0, NO_STANDINGS, viewAt(THIRD_CAMERA));

  it("puts 3식당's reason at its right, its left reaching past the left edge", () => {
    // "3식당 · 14분밖에 못 있어요", 152 wide: at the left from -37.9; at the right 154.1 to 306.1, 215.2 to 241.2.
    expect(sideOf(drawing, 'answer:dropped:3식당')).toBe('right');
  });

  it("keeps the long reasons at 301동 and 302동 at the left, and 민수's tag", () => {
    // "301동식당 · 5분밖에 못 있어요", 170: 49.7 to 219.7. 302동식당's, 170: 51.2 to 221.2, 463 to 489.
    expect(sideOf(drawing, 'answer:dropped:301동식당')).toBe('left');
    expect(sideOf(drawing, 'answer:dropped:302동식당')).toBe('left');
    expect(sideOf(drawing, `answer:person:${MINSU_ID}`)).toBe('right');
    expect(sideOf(drawing, 'answer:meeting:1')).toBe('above');
    expect(sideOf(drawing, 'answer:pick')).toBe('below');
  });
});

// Partitions: a label whose only side inside the area covers another mark; first sides under the pill and under the
// card with a free side left.
describe('a label near the pill, the card, and other marks', () => {
  it("leaves 302동식당 out at the lowest zoom rather than above 302동, over the User's dot and tag", () => {
    // At `THIRD_AT_LOWEST` 302동 stands at (244.0, 502.9): at a side or below its label reaches past 500. Above, 198.0
    // to 290.0 and 456.9 to 482.9, it covers 301동's symbol box (224.3 to 260.3, 439.5 to 475.5) and "나 · 15분"
    // (262.3 to 326.3, 444.5 to 470.5).
    const drawing = drawingOf(MEAL_ANSWER, 2, NO_STANDINGS, viewAt(THIRD_AT_LOWEST));

    expect(seen(drawing, 'answer:candidate:302동식당')).toMatchObject({ name: '후보 1 · 302동식당', label: null });
  });

  it('puts a flag under its point when above it would lie under the pill', () => {
    // Changed from the stored copy: the meeting flag "12:18 민수와 만남" stands at the view's (300, 140). Above, it
    // would run from 94 to 120, over 108; below, 244.5 to 355.5 and 160 to 186, it covers nothing.
    const at = positionAt(THIRD_CAMERA, { x: 300, y: 140 });
    const answer = withScene(MEAL_ANSWER, 2, (scene) => ({
      ...scene,
      flags: scene.flags.map((flag) => (flag.role === 'meeting' ? { ...flag, at } : flag)),
    }));

    expect(sideOf(drawingOf(answer, 2, NO_STANDINGS, viewAt(THIRD_CAMERA)), 'answer:meeting:1')).toBe('below');
  });

  it('puts a candidate above its point when its left, right, and lower sides would reach under the card', () => {
    // Changed from the stored copy: 자하연식당 2층, 91 wide, stands at the first Plan's view's (130, 492). At the left
    // (19 to 110) and the right (150 to 241) it would reach 505, below further; above, 84.5 to 175.5 and 446 to 472,
    // it stays clear of the pick's lines from 184.4 and covers nothing.
    const at = positionAt(FIRST_CAMERA, { x: 130, y: 492 });
    const answer = withScene(MEAL_ANSWER, 0, placeMoved('자하연식당 2층', at));

    expect(sideOf(drawingOf(answer, 0, NO_STANDINGS, viewAt(FIRST_CAMERA)), 'answer:candidate:자하연식당 2층')).toBe(
      'above',
    );
  });
});
