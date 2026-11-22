/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { crowdedMealAnswer } from '@/api/mock/data/crowded-meal';
import { ANSWER_SYMBOL_BOX } from '@/design-system';
import { panToShow } from '@/features/assistant/answer-camera';
import { drawingOf } from '@/features/assistant/answer-marks';
import { withDots } from '@/features/assistant/meal-marks';
import { inView } from '@/map';
import { seen } from '../support/answer-marks';
import { AREA, FIRST_CAMERA, positionAt, viewAt } from '../support/answer-view';

// The crowded meal answer's map (the answer screen's redesign, boards E1 and E2): eleven restaurants between a Class
// ending at 301동 at 10:45 and one at 302동 at 15:30.
const CROWDED = crowdedMealAnswer('2026-10-07', '2026-10-06T04:00:00Z');

// Partitions: the Assistant's pick with a way there and a way on; another pick in the next Class's building, with no
// way on.
describe("the crowded meal answer's first pick", () => {
  const drawing = drawingOf(CROWDED, 0);

  it('says where the User starts and the next Class as dark labels with their times', () => {
    expect(seen(drawing, 'answer:me').label).toMatchObject({ tone: 'meeting', title: '10:45 301동' });
    expect(seen(drawing, 'answer:next:place-302').label).toMatchObject({ tone: 'meeting', title: '15:30 302동 수업' });
  });

  it('draws the way there solid and the way on dotted, each with its minutes', () => {
    expect(drawing.lines.map(({ style }) => style.dash)).toEqual([undefined, [1, 8]]);
    expect(seen(drawing, 'answer:leg:0').label).toMatchObject({ tone: 'leg', title: '15분' });
    expect(seen(drawing, 'answer:leg:1').label).toMatchObject({ tone: 'leg', title: '17분' });
  });

  it('draws the way on as dots, which the native map cannot dash, and the way there whole', () => {
    const lines = withDots(drawing.lines);
    expect(lines[0]).toBe(drawing.lines[0]);
    expect(lines.length).toBeGreaterThan(20);
    expect(lines.slice(1).every(({ id, points }) => id.startsWith('answer:route:1:dot:') && points.length === 2)).toBe(
      true,
    );
  });

  it('gives the pick its label with "메뉴 ›" and never fades it, though its walking is over thirty minutes', () => {
    const { label } = seen(drawing, 'answer:pick');
    expect(label).toMatchObject({ title: '학생회관식당', note: '11:00 · 걸음 32분', action: '메뉴 ›' });
    expect(label).not.toHaveProperty('faded');
  });

  it('fades a candidate whose walking is over thirty minutes, and not one under', () => {
    expect(seen(drawing, 'answer:candidate:자하연식당 2층').symbol).toMatchObject({ faded: true });
    expect(seen(drawing, 'answer:candidate:3식당').symbol).not.toHaveProperty('faded');
  });

  it('keeps every candidate in the camera', () => {
    expect(drawing.keep).toEqual(drawing.points);
  });
});

describe('302동식당 chosen', () => {
  const drawing = drawingOf(CROWDED, 1);

  it('moves the label to it, with only the way there drawn and its minutes', () => {
    expect(seen(drawing, 'answer:pick').label).toMatchObject({ title: '302동식당', note: '11:30 · 걸음 2분' });
    expect(drawing.lines).toHaveLength(1);
    expect(seen(drawing, 'answer:leg:0').label).toMatchObject({ title: '2분' });
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
