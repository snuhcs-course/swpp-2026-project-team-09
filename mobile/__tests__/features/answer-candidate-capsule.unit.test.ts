/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { type AnswerDrawing, drawingOf } from '@/features/assistant/answer-marks';
import { inView } from '@/map';
import { lookName } from '@/map/marker-looks';
import { ignoreMark, planPress } from '@/screens/main/answer-presses';
import { LOOKS_AHEAD } from '@/screens/main/use-looks-ahead';
import { seen } from '../support/answer-marks';
import { FIRST_CAMERA, SIZE, viewAt } from '../support/answer-view';

// A meal candidate's number and minutes as one capsule (P04 ticket 83): the numbered round a candidate without minutes
// has, and beside it a picture of the minutes alone, drawn under the round so that the two read as one capsule.
const PLACE = '3식당';
const ROUND = `answer:candidate:${PLACE}`;
const MINUTES = `${ROUND}:minutes`;
const PLAN = MEAL_ANSWER_MENUS.plans.find(({ place }) => place.label === PLACE);
if (PLAN === undefined) {
  throw new Error(`The stored answer has no ${PLACE}`);
}
const AT = inView({ latitude: PLAN.place.latitude, longitude: PLAN.place.longitude }, FIRST_CAMERA, SIZE);
// The premade round of candidate 4, made on the everyday map (P04 ticket 81).
const ROUND_4 = LOOKS_AHEAD[3];

// The first Plan at the emulator's camera, its area the given room left and right of 3식당 and 80 up and down,
// room enough for a tag above or below it.
function withRoom(left: number, right: number): AnswerDrawing {
  const area = { top: AT.y - 80, right: AT.x + right, bottom: AT.y + 80, left: AT.x - left };
  return drawingOf(MEAL_ANSWER_MENUS, 0, undefined, viewAt(FIRST_CAMERA, area));
}

function orderOf(drawing: AnswerDrawing, id: string): number {
  return drawing.things.find((thing) => thing.id === id)?.order ?? Number.NaN;
}

function minutesOf(drawing: AnswerDrawing): ReturnType<typeof seen> | undefined {
  return drawing.things.some(({ id }) => id === MINUTES) ? seen(drawing, MINUTES) : undefined;
}

// Partitions: a tagged candidate's two pictures. Expected values: candidate 4 of the stored answer, "19분".
describe("a tagged candidate's number", () => {
  const drawing = drawingOf(MEAL_ANSWER_MENUS, 0);

  it('shows once, on its round, and never in its minutes', () => {
    expect(seen(drawing, ROUND)).toMatchObject({
      symbol: { type: 'dot', role: 'candidate', number: 4 },
      label: null,
    });
    expect(minutesOf(drawing)).toMatchObject({
      symbol: null,
      label: { tone: 'minutes', title: '19분', line: null, number: null },
    });
  });

  it('is drawn under its round, so that the round stands at the capsule’s end', () => {
    expect(orderOf(drawing, MINUTES)).toBeLessThan(orderOf(drawing, ROUND));
  });

  it('says the whole once, on the capsule, and the round its number and place', () => {
    expect(minutesOf(drawing)?.name).toBe(`후보 4 · ${PLACE} · 걸음 19분`);
    expect(seen(drawing, ROUND).name).toBe(`후보 4 · ${PLACE}`);
  });

  it('chooses its Plan at a press on the minutes, as on the round', () => {
    const shown: string[] = [];
    const show = (planId: string): void => {
      shown.push(planId);
    };
    const press = planPress(drawing, { pick: ignoreMark, show, recalculating: false }, false, ignoreMark);

    press(MINUTES);
    press(ROUND);

    expect(shown).toEqual([PLAN.id, PLAN.id]);
  });
});

// Partitions: room at the right; room at the left only; room at neither side. Expected values: the capsule's side, or
// none, and in every case the same premade round with its number.
describe('the capsule’s side by the room beside the round', () => {
  it.each([
    ['at the right when the right has room', withRoom(35, 150), 'right'],
    ['at the left when only the left has room', withRoom(150, 35), 'left'],
  ])('runs %s', (_, drawing, side) => {
    expect(minutesOf(drawing)?.label).toMatchObject({ side, tone: 'minutes', title: '19분' });
  });

  it('drops the minutes when neither side has room, above and below as much as there is, and the round stays', () => {
    const drawing = withRoom(35, 35);

    expect(minutesOf(drawing)).toBeUndefined();
    expect(seen(drawing, ROUND)).toMatchObject({ name: `후보 4 · ${PLACE} · 걸음 19분`, symbol: { number: 4 } });
  });

  it('never changes the round between the three', () => {
    const rounds = [withRoom(35, 150), withRoom(150, 35), withRoom(35, 35)].map((drawing) => {
      const { look } = drawing.things.find(({ id }) => id === ROUND) ?? {};
      return look === undefined ? null : lookName(look);
    });

    expect(ROUND_4).toBeDefined();
    expect(rounds).toEqual(Array.from({ length: 3 }, () => (ROUND_4 === undefined ? null : lookName(ROUND_4))));
  });
});

// Partitions: a candidate on the User's own spot, whose round is not drawn; every board of the answer. Expected values:
// the orchestrator's decision on PR review (2026-11-26), the same capsule with the round inside, and no candidate's
// navy-bordered pill left on a meal map.
describe('a candidate without a round of its own', () => {
  it('carries its round in its capsule, beside the spot another mark holds', () => {
    const { symbol, label } = seen(drawingOf(MEAL_ANSWER_MENUS, 0), 'answer:candidate:301동식당');

    expect(symbol).toBeNull();
    expect(label).toMatchObject({ tone: 'minutes', title: '15분', number: 2 });
  });

  it.each(MEAL_ANSWER_MENUS.plans.map((_, index) => index))('leaves no candidate pill on board %i', (index) => {
    const tones = drawingOf(MEAL_ANSWER_MENUS, index).things.flatMap(({ look }) =>
      look.kind === 'answer' && look.label !== null ? [look.label.tone] : [],
    );

    expect(tones).not.toContain('candidate');
  });
});

