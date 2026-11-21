/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_FIXED_START } from '@/api/mock/data/meal-answers';
import { MEET_ANSWER_FROM_14 } from '@/api/mock/data/meet-answer';
import { NOT_RUNNING_LOOKUP_REPLY } from '@/api/mock/data/way-lookups';
import { type AnswerDrawing, drawingOf, drawingOfScene, looksOf } from '@/features/assistant/answer-marks';
import { NO_STANDINGS } from '@/features/assistant/invited-friends';
import { CAMERA_BOUNDS } from '@/map';
import { MINSU_ID, NEXT_CLASS, seen, sideOf } from '../support/answer-marks';
import {
  AREA,
  cameraPutting,
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
// number's badge of 16 and 4, the pick's border of 2 at each side, and its words: a Hangul syllable 0.87 of the
// font's size, a space, "·", or ":" 0.29, a digit 0.67, at 12 points, or 14 for the pick's title; rounded up. The
// area runs from 108 to 500 and from 16 to 395, and a box less than a point over it is inside. A symbol box is 36
// square on its point. Labels take sides flags first, then the pick, people, the next Class, candidates, and
// Restaurants that do not fit; a side is free when its box stays inside the area and covers no other point's symbol
// box and no label placed before it.
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
      name: '후보 5 · 자하연식당 2층 · 12:35',
      label: null,
    });
  });

  it("puts the pick's two lines above 302동 when the area ends two points higher, over 301동's symbol", () => {
    // Below would end at 500, 2 past 498; above, 184.4 to 289.4 and 368 to 414, it covers 301동's symbol box (217.5
    // to 253.5, 379.1 to 415.1) but stays inside the area, and the pick's label is never left out (ticket 25).
    const shorter = drawingOf(MEAL_ANSWER, 0, NO_STANDINGS, viewAt(FIRST_CAMERA, { ...AREA, bottom: AREA.bottom - 2 }));

    expect(seen(shorter, 'answer:pick').label).toMatchObject({ side: 'above', line: '12:15 점심' });
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

    expect(seen(drawing, 'answer:candidate:302동식당')).toMatchObject({
      name: '후보 1 · 302동식당 · 12:15',
      label: null,
    });
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
    // Changed from the stored copy: 자하연식당 2층 with its time, 130 wide, stands at the first Plan's view's (110, 492).
    // At the left it would start out of the area, at the right (130 to 260) it would reach 505, below further; above,
    // 45 to 175 and 446 to 472, it stays clear of the pick's lines from 184.4 and covers nothing.
    const at = positionAt(FIRST_CAMERA, { x: 110, y: 492 });
    const answer = withScene(MEAL_ANSWER, 0, placeMoved('자하연식당 2층', at));

    expect(sideOf(drawingOf(answer, 0, NO_STANDINGS, viewAt(FIRST_CAMERA)), 'answer:candidate:자하연식당 2층')).toBe(
      'above',
    );
  });
});

// The first Plan of board a6's answer (`meet-answer-a6.json`) under its card of 364 on the emulator: the area runs
// from 108 to 914 − 364 − 8 = 542. Its own points, from 58동 (37.46568) down to 302동 앞 (37.44887), do not fit the area
// even at the outer zoom, 14.765, where a degree of latitude is about 24,930 points, and the camera rests there with
// the view's bottom on the south edge of the camera's bounds (37.432): 302동 앞, with 민수's face over its dot, at
// (232.8, 493.3), 제1공학관 앞 at (231.6, 461.2), and 유회진 학술정보관 앞 at (233.8, 441.4).
//
// Partitions: the pick with no free side: below past the area, above inside it but over other symbols.
describe("the pick's label of board a6's first Plan at the emulator's camera", () => {
  const camera = cameraPutting({ latitude: CAMERA_BOUNDS.south, longitude: 126.95127 }, { x: 205.5, y: 914 }, 14.765);
  const drawing = drawingOf(MEET_ANSWER_FROM_14, 0, NO_STANDINGS, viewAt(camera, { ...AREA, bottom: 542 }));

  it('puts it above 302동 앞, inside the area, over the symbols of 제1공학관 앞 and 유회진 학술정보관 앞', () => {
    // "302동 앞" / "14:07 만남" with the pick's number, 46 high: below from 513.3 to 559.3, past 542; above from 427.3
    // to 473.3, over 제1공학관 앞's symbol box (443.2 to 479.2) and 유회진 학술정보관 앞's (423.4 to 459.4).
    expect(seen(drawing, 'answer:pick').label).toMatchObject({
      side: 'above',
      tone: 'pick',
      title: '302동 앞',
      line: '14:07 만남',
      number: 1,
    });
  });
});

// The third Plan's pick, 학생회관, which no other Plan of the stored answer picks.
const HAKGWAN = { latitude: 37.45932, longitude: 126.95058 };

// Partitions: a view given for one Plan's drawing alone. Expected values: at the third Plan's camera the label of
// 자하연식당 2층, candidate 5, is left out (above); without a view every Plan but the fifth, which picks it, puts it at
// its left (`answer-marks.unit.test.ts`).
describe('the looks of every Plan of an answer', () => {
  it("are made at the view given for each Plan's own drawing", () => {
    const looks = looksOf(MEAL_ANSWER, ({ pick }) =>
      pick?.latitude === HAKGWAN.latitude && pick.longitude === HAKGWAN.longitude ? viewAt(THIRD_CAMERA) : null,
    );

    const sides = looks.flatMap((look) => {
      if (look.kind !== 'answer' || look.symbol?.type !== 'dot') {
        return [];
      }
      return look.symbol.role === 'candidate' && look.symbol.number === 5 ? [look.label?.side ?? null] : [];
    });
    expect(sides).toEqual(expect.arrayContaining(['left', null]));
  });
});

// The shuttle-not-running Lookup's pick, "(관악사)학부 생활관(919동)" with its line "22:21 도착 · 919동", about 190
// wide and 46 high: centred below or above its point it reaches 95 to each side. Put at (380, 300), 15 from the area's
// right edge, neither fits, and it takes its left (from about 170 to 360); put at (30, 300), its right (from 50 to
// about 240). Expected values: the worked numbers above.
//
// Partitions: the pick near the area's right edge, and near its left edge.
describe("a Lookup's pick whose label fits neither below nor above", () => {
  const scene = NOT_RUNNING_LOOKUP_REPLY.lookup?.scene;
  const at = scene?.places[0]?.place;
  if (scene === undefined || at === undefined) {
    throw new Error('The stored Lookup has no Place');
  }
  const drawn = (x: number): AnswerDrawing => drawingOfScene(scene, viewAt(cameraPutting(at, { x, y: 300 })));

  it('takes its left near the right edge, whole inside the screen', () => {
    expect(seen(drawn(380), 'answer:pick').label).toMatchObject({ side: 'left', title: '(관악사)학부 생활관(919동)' });
  });

  it('takes its right near the left edge', () => {
    expect(sideOf(drawn(30), 'answer:pick')).toBe('right');
  });
});
