/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, Plan } from '@/api/assistant-types';
import { MEAL_ANSWER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { ANSWER_SYMBOL_BOX, type AnswerLabel } from '@/design-system';
import { labelBoxAt, type LabelView, overlaps } from '@/features/assistant/answer-labels';
import { type AnswerDrawing, drawingOf } from '@/features/assistant/answer-marks';
import { inView } from '@/map';
import { seen } from '../support/answer-marks';
import { cameraPutting, positionAt, SIZE } from '../support/answer-view';

// The chosen place's label over no other candidate (P04 ticket 89). The user's phone ("내일 저녁?", the list raised to
// its end, so the map's strip is short): 아워홈(901동) stood just under the time card, so its label had room below it
// only, and there, two lines wide, it covered candidate 6's round.

// 302동식당, the first Plan's pick, at (280, 200), the strip from 185, just under it: its label, ±23 high at its left
// or right and 46 high above it, fits below it alone. Two lines wide it spans ±84 there, one line ±75.5.
const PICK = { latitude: 37.44887, longitude: 126.95265 };
const CAMERA = cameraPutting(PICK, { x: 280, y: 200 });
const AREA = { top: 185, right: 395, bottom: 520, left: 16 };
const VIEW: LabelView = { camera: CAMERA, size: SIZE, area: AREA };
const HALF = ANSWER_SYMBOL_BOX / 2;

// The stored answer with candidates moved to the given points of the view, by their places' labels.
function withCandidatesAt(points: Readonly<Record<string, { x: number; y: number }>>): AnswerReply {
  const moved = (place: Plan['place']): Plan['place'] => {
    const point = points[place.label];
    return point === undefined ? place : { ...place, ...positionAt(CAMERA, point) };
  };
  const plans = MEAL_ANSWER_MENUS.plans.map((plan) => ({
    ...plan,
    place: moved(plan.place),
    scene: { ...plan.scene, places: plan.scene.places.map((item) => ({ ...item, place: moved(item.place) })) },
  }));
  return { ...MEAL_ANSWER_MENUS, plans };
}

function pickLabel(drawing: AnswerDrawing): AnswerLabel {
  const { label } = seen(drawing, 'answer:pick');
  if (label === null) {
    throw new Error('The pick has no label');
  }
  return label;
}

// The candidates whose round's room (its symbol box) the pick's label covers.
function coveredRounds(drawing: AnswerDrawing, view: LabelView = VIEW): string[] {
  const box = labelBoxAt(view, PICK, pickLabel(drawing));
  return drawing.things.flatMap(({ id, position, look }) => {
    if (
      !id.startsWith('answer:candidate:') ||
      id.endsWith(':minutes') ||
      look.kind !== 'answer' ||
      look.symbol === null
    ) {
      return [];
    }
    const { x, y } = inView(position, view.camera, SIZE);
    return overlaps(box, { top: y - HALF, right: x + HALF, bottom: y + HALF, left: x - HALF }) ? [id] : [];
  });
}

// Every capsule the pick's label covers.
function coveredCapsules(drawing: AnswerDrawing): string[] {
  const box = labelBoxAt(VIEW, PICK, pickLabel(drawing));
  return drawing.things.flatMap(({ id, position, look }) =>
    id.endsWith(':minutes') && look.kind === 'answer' && look.label !== null
      ? overlaps(box, labelBoxAt(VIEW, position, look.label))
        ? [id]
        : []
      : [],
  );
}

// A candidate 98 points left of the pick and 30 below: under the label two lines wide, clear of it on one line.
const BESIDE = { 학생회관식당: { x: 182, y: 230 } };

// Partitions: a candidate under the two-line label where the one-line one is clear; candidates under the one-line
// label too; a side clear of every round. Expected values: the ticket's rule.
describe("the chosen place's label where its strip of map is short", () => {
  it('says its name and time on one line, clear of a round its two lines would cover', () => {
    const drawing = drawingOf(withCandidatesAt(BESIDE), 0, undefined, VIEW);

    expect(pickLabel(drawing)).toMatchObject({ side: 'below', title: '302동식당', note: '12:15', line: null });
    expect(coveredRounds(drawing)).toEqual([]);
  });

  it('covers the fewest rounds where every way covers one, and no capsule, which gives way', () => {
    const answer = withCandidatesAt({ ...BESIDE, '3식당': { x: 280, y: 240 } });
    const drawing = drawingOf(answer, 0, undefined, VIEW);

    expect(pickLabel(drawing)).toMatchObject({ side: 'below', line: null });
    expect(coveredRounds(drawing)).toEqual(['answer:candidate:3식당']);
    expect(coveredCapsules(drawing)).toEqual([]);
  });

  it('keeps its two lines at a side clear of every round where one is', () => {
    const wide = { ...VIEW, area: { ...AREA, top: 120 } };
    const drawing = drawingOf(withCandidatesAt({ 학생회관식당: { x: 280, y: 245 } }), 0, undefined, wide);

    expect(pickLabel(drawing).line).toBe('뼈없는감자탕 외 5');
    expect(coveredRounds(drawing, wide)).toEqual([]);
  });

  it('stays as it is for a move of a few points', () => {
    const answer = withCandidatesAt(BESIDE);
    const nudged = { ...VIEW, camera: cameraPutting(PICK, { x: 282, y: 201 }) };

    expect(pickLabel(drawingOf(answer, 0, undefined, nudged))).toMatchObject({ side: 'below', line: null });
  });
});
