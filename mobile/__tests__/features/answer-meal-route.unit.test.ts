/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { crowdedMealAnswer } from '@/api/mock/data/crowded-meal';
import { ANSWER_SYMBOL_BOX } from '@/design-system';
import { panToShow } from '@/features/assistant/answer-camera';
import { LEG_STYLES } from '@/features/assistant/answer-groups';
import { drawingOf } from '@/features/assistant/answer-marks';
import { withDots } from '@/features/assistant/meal-marks';
import { inView } from '@/map';
import { seen } from '../support/answer-marks';
import { AREA, FIRST_CAMERA, positionAt, viewAt } from '../support/answer-view';

// A colour's relative luminance as WCAG 2 counts it.
function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((at) => {
    const channel = Number.parseInt(hex.slice(at, at + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(one: string, other: string): number {
  const [light = 0, dark = 0] = [luminance(one), luminance(other)].toSorted((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

// The crowded meal answer's map (the answer screen's redesign, boards E1 and E2): eleven restaurants between a Class
// ending at 301동 at 10:45 and one at 302동 at 15:30.
const CROWDED = crowdedMealAnswer('2026-10-07', '2026-10-06T04:00:00Z');
// The crowded answer's Plans are in the order of their walking; a test names the one it shows.
const at = (name: string): number => CROWDED.plans.findIndex(({ place }) => place.label === name);

// Partitions: the Assistant's pick with a way there and a way on; another pick in the next Class's building, with no
// way on.
describe('학생회관식당 chosen in the crowded meal answer', () => {
  const drawing = drawingOf(CROWDED, at('학생회관식당'));

  it('says where the User starts and the next Class as dark labels with their times', () => {
    expect(seen(drawing, 'answer:me').label).toMatchObject({ tone: 'meeting', title: '10:45 301동' });
    expect(seen(drawing, 'answer:next:place-302').label).toMatchObject({ tone: 'meeting', title: '15:30 302동 수업' });
  });

  // P04 ticket 76: the way there a dark thin line, the way on a pale wide band drawn first so that it lies under it.
  it('draws the way on as a pale band under the way there, a dark thin line', () => {
    expect(drawing.lines.map(({ id, style }) => [id, style])).toEqual([
      ['answer:route:1', LEG_STYLES.walkOn],
      ['answer:route:0', LEG_STYLES.walkThere],
    ]);
    expect(LEG_STYLES.walkOn.width).toBeGreaterThan(LEG_STYLES.walkThere.width);
  });

  it("gives each leg's minutes the look of its line: dark for the way there, pale for the way on", () => {
    expect(seen(drawing, 'answer:leg:0:15분').label).toMatchObject({ tone: 'leg', title: '15분' });
    expect(seen(drawing, 'answer:leg:1:17분').label).toMatchObject({ tone: 'legOn', title: '17분' });
  });

  it('draws no dots: each line stays whole', () => {
    expect(withDots(drawing.lines)).toEqual(drawing.lines);
    expect(drawing.lines.some(({ id }) => id.includes(':dot:'))).toBe(false);
  });

  it('gives the pick its label with "메뉴 ›" and never fades it, though its walking is over thirty minutes', () => {
    const { label } = seen(drawing, 'answer:pick');
    expect(label).toMatchObject({ title: '학생회관식당', note: '11:00', action: '메뉴 ›' });
    expect(label).not.toHaveProperty('faded');
  });

  // By the main server's fifteen minutes (P04 ticket 71): 감골식당, with fifteen to nineteen before the Class, is kept.
  it('fades a candidate that cannot be done before the next Class, and not one only far away', () => {
    expect(seen(drawing, 'answer:candidate:기숙사식당 (관악사 919동)').symbol).toMatchObject({ faded: true });
    expect(seen(drawing, 'answer:candidate:감골식당').symbol).not.toHaveProperty('faded');
    expect(seen(drawing, 'answer:candidate:자하연식당 2층').symbol).not.toHaveProperty('faded');
    expect(seen(drawing, 'answer:candidate:3식당').symbol).not.toHaveProperty('faded');
  });

  it('keeps every candidate in the camera', () => {
    expect(drawing.keep).toEqual(drawing.points);
  });
});

// The campus ground as the Kakao map draws it (the emulator, 2026-11-26), and WCAG's 3:1 for a graphic: the pale blue
// band first drawn (#9FB0E6) was 1.6:1 on it and hard to see on the phone.
describe("the way on's band on the map", () => {
  const campus = '#D1E3EE';

  it('stands at least 3:1 against the campus, and the way there at least 3:1 against it', () => {
    expect(contrast(LEG_STYLES.walkOn.color, campus)).toBeGreaterThanOrEqual(3);
    expect(contrast(LEG_STYLES.walkThere.color, LEG_STYLES.walkOn.color)).toBeGreaterThanOrEqual(3);
  });
});

describe('302동식당 chosen', () => {
  const drawing = drawingOf(CROWDED, at('302동식당'));

  it('moves the label to it, with only the way there drawn and its minutes', () => {
    expect(seen(drawing, 'answer:pick').label).toMatchObject({ title: '302동식당', note: '11:30' });
    expect(drawing.lines).toHaveLength(1);
    expect(seen(drawing, 'answer:leg:0:2분').label).toMatchObject({ title: '2분' });
  });
});

// Partitions: a chosen place inside the labels' area, and one below it.
describe('the view a meal answer keeps while another place is chosen', () => {
  const view = viewAt(FIRST_CAMERA);
  const inside = positionAt(FIRST_CAMERA, { x: 200, y: 400 });
  const below = positionAt(FIRST_CAMERA, { x: 200, y: AREA.bottom + 40 });

  it('stays as it is when the chosen place is in its area', () => {
    expect(panToShow(view, inside)).toBe(view);
  });

  it('moves at its zoom just enough to bring a place below its area in', () => {
    const moved = panToShow(view, below);
    expect(moved.camera.zoom).toBe(view.camera.zoom);
    expect(inView(below, moved.camera, moved.size).y).toBeCloseTo(AREA.bottom - ANSWER_SYMBOL_BOX, 3);
  });
});

// Partitions: the way there by shuttle (the shuttle-aware Plan, the crowded mock's 자하연식당 2층); the way on on foot.
describe('a leg by shuttle', () => {
  it('reads "셔틀 N분" on its label, and the way on its minutes alone', () => {
    const drawing = drawingOf(CROWDED, at('자하연식당 2층'));

    expect(seen(drawing, 'answer:leg:0:셔틀 13분').label).toMatchObject({ tone: 'legShuttle', title: '셔틀 13분' });
    expect(seen(drawing, 'answer:leg:1:20분').label).toMatchObject({ tone: 'legOn', title: '20분' });
  });
});
