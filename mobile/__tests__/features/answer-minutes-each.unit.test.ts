/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_MENUS } from '@/api/mock/data/meal-answer-menus';
import type { LabelView } from '@/features/assistant/answer-labels';
import { drawingOf } from '@/features/assistant/answer-marks';
import { minutesOf, seen } from '../support/answer-marks';
import { FIRST_CAMERA, viewAt } from '../support/answer-view';

// Each meal candidate's minutes left out on their own (P04 ticket 84): only where they have no room, nearer numbers
// placed first, never because an earlier candidate had none.

// The emulator's first view of the stored "뭐 먹을까" answer (2026-11-26), with the everyday Friends' faces it keeps
// clear of: 학생회관식당 (3) has a Friend's face at its right and the next Class's mark at its left.
const EMULATOR_VIEW: LabelView = {
  camera: { centre: { latitude: 37.451688817, longitude: 126.95058 }, zoom: 14.7860472 },
  size: { width: 411.42856, height: 914.28571 },
  area: { top: 176, right: 395.42856, bottom: 594.47618, left: 16 },
  avoid: [
    { latitude: 37.45952, longitude: 126.95209 },
    { latitude: 37.46108, longitude: 126.9527 },
    { latitude: 37.45799, longitude: 126.94868 },
    { latitude: 37.46271, longitude: 126.951 },
    { latitude: 37.45848, longitude: 126.95523 },
    { latitude: 37.46097, longitude: 126.95338 },
    { latitude: 37.45519, longitude: 126.95325 },
  ],
  fontScale: 1,
};

// Partitions: a candidate after one without room, at the emulator's view. Expected values: the emulator's capture,
// where 3 had no room and 4 had room at its right.
describe("a meal candidate's minutes after one without room", () => {
  it('stay where they have room, though the candidate before them has none', () => {
    const drawing = drawingOf(MEAL_ANSWER_MENUS, 0, undefined, EMULATOR_VIEW);

    expect(minutesOf(drawing, '학생회관식당')).toBeNull();
    expect(minutesOf(drawing, '3식당')).toMatchObject({ side: 'right', title: '19분' });
    expect(seen(drawing, 'answer:candidate:학생회관식당').symbol).toMatchObject({ number: 3 });
  });
});

// Partitions: an answer other than a meal's with menus, whose candidates are name tags. Expected values: ticket 13's
// rule, kept for them: once one has no tag, none after it has one.
describe("the name tags of an answer's candidates without menus", () => {
  it('are still left out from the lowest rank upward', () => {
    const drawing = drawingOf(MEAL_ANSWER, 0, undefined, viewAt(FIRST_CAMERA));
    const tagged = MEAL_ANSWER.plans
      .map((plan) => drawing.things.find(({ id }) => id === `answer:candidate:${plan.place.label}`))
      .flatMap((thing) =>
        thing?.look.kind === 'answer' && thing.look.symbol !== null ? [thing.look.label !== null] : [],
      );

    expect(tagged).toEqual(tagged.toSorted((one, other) => Number(other) - Number(one)));
  });
});
