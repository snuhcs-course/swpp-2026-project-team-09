/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, Plan } from '@/api/assistant-types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { drawingOf } from '@/features/assistant/answer-marks';
import type { MapAvatar } from '@/map';
import { answerFaceOf } from '@/screens/main/use-answer-faces';
import { minutesOf, seen } from '../support/answer-marks';
import { FIRST_CAMERA, THIRD_CAMERA, viewAt } from '../support/answer-view';
import { inView } from '@/map';

// The other candidates' tags while an answer is up (P04 ticket 13, boards 20 to 22): each with its number, name, and
// arrival time, and in a meal answer its dishes and price under them; the pick's flag with its own first dish; two
// candidates at one point both labelled; and the faces of Friends outside the answer faint.

// Partitions: a meal answer with menus (a small tag of walking; the pick's two-line label), and without.
describe('the tags of a meal answer with menus', () => {
  const drawing = drawingOf(MEAL_ANSWER_MENUS, 0);

  // P04 ticket 83: the number on the candidate's round, the walking in a capsule beside it.
  it('gives a candidate its numbered round and the walking it adds beside it, with no dishes and no price', () => {
    const { name, symbol } = seen(drawing, 'answer:candidate:학생회관식당');
    expect(name).toBe('후보 3 · 학생회관식당');
    expect(symbol).toMatchObject({ type: 'dot', role: 'candidate', number: 3 });
    expect(minutesOf(drawing, '학생회관식당')).toMatchObject({
      tone: 'minutes',
      title: '16분',
      line: null,
      number: null,
    });
    expect(minutesOf(drawing, '학생회관식당')).not.toHaveProperty('sub');
  });

  it('counts the way there and the way on to the next Class', () => {
    expect(minutesOf(drawing, '자하연식당 2층')).toMatchObject({ title: '22분', line: null });
  });

  // P04 ticket 74: the walk is the route's own pill; the label says the name and start over the main dish. A screen
  // reader still reads it whole.
  it("gives the pick's label its time after its name, and its first dish and the rest's count under them", () => {
    expect(seen(drawing, 'answer:pick')).toMatchObject({
      name: '302동식당 · 12:15 · 걸음 20분 · 뼈없는감자탕 외 5 · 4,000원부터',
      label: {
        tone: 'pick',
        title: '302동식당',
        note: '12:15',
        line: '뼈없는감자탕 외 5',
        action: '메뉴 ›',
      },
    });
  });
});

describe('the tags of a meal answer without menus', () => {
  const drawing = drawingOf(MEAL_ANSWER, 0);

  it('gives a candidate its number, name, and arrival time on one line', () => {
    const { name, label } = seen(drawing, 'answer:candidate:학생회관식당');
    expect(name).toBe('후보 3 · 학생회관식당 · 12:33');
    expect(label).toMatchObject({ title: '학생회관식당', line: '12:33' });
    expect(label).not.toHaveProperty('sub');
  });
});

// The stored answer with 3식당 moved onto 자하연식당 2층's point, two restaurants of one building.
function withOneBuilding(answer: AnswerReply): AnswerReply {
  const other = answer.plans.find(({ place }) => place.label === '자하연식당 2층')?.place;
  if (other === undefined) {
    throw new Error('The stored answer has no 자하연식당 2층');
  }
  const moved = (place: Plan['place']): Plan['place'] =>
    place.label === '3식당' ? { ...place, latitude: other.latitude, longitude: other.longitude } : place;
  const plans = answer.plans.map((plan) => ({
    ...plan,
    place: moved(plan.place),
    scene: { ...plan.scene, places: plan.scene.places.map((item) => ({ ...item, place: moved(item.place) })) },
  }));
  return { ...answer, plans };
}

// Partitions: room short for every label but the kept ones; candidates alone and two at one point.
describe('two candidates at one point when room is short', () => {
  const tight = viewAt(FIRST_CAMERA, { top: 0, right: 1, bottom: 1, left: 0 });

  it('leaves out the label of a candidate alone', () => {
    expect(seen(drawingOf(MEAL_ANSWER, 0, undefined, tight), 'answer:candidate:3식당').label).toBeNull();
  });

  it('keeps both labels, at different sides, each pressed for its own Plan', () => {
    const drawing = drawingOf(withOneBuilding(MEAL_ANSWER), 0, undefined, tight);
    const one = seen(drawing, 'answer:candidate:3식당');
    const other = seen(drawing, 'answer:candidate:자하연식당 2층');

    expect(one.label).not.toBeNull();
    expect(other.label).not.toBeNull();
    expect(one.label?.side).not.toBe(other.label?.side);
    expect([one.planId, other.planId]).toEqual(['3식당', '자하연식당 2층']);
  });
});

// The third Plan (the pick 학생회관식당) in a crowded view: an area around 302동 only, where no side of candidate 1's
// tag fits. 302동식당 (1) stands on 민수's point and 301동식당 (2) on the User's, so neither has a dot of its own.
describe('a candidate without a dot of its own when room is short (review of PR 437)', () => {
  const at = inView({ latitude: 37.44887, longitude: 126.95265 }, THIRD_CAMERA, { width: 411, height: 914 });
  const crowded = viewAt(THIRD_CAMERA, { top: at.y - 1, right: at.x + 1, bottom: at.y + 1, left: at.x - 1 });

  it('keeps its tag and its press, whatever the candidates before it keep', () => {
    const drawing = drawingOf(MEAL_ANSWER, 2, undefined, crowded);
    const second = seen(drawing, 'answer:candidate:301동식당');

    expect(seen(drawing, 'answer:candidate:302동식당').symbol).toBeNull();
    expect(second.symbol).toBeNull();
    expect(second.label).toMatchObject({ title: '301동식당', number: 2 });
    expect(second.planId).toBe('301동식당');
  });
});

function withCuisine(answer: AnswerReply, cuisine: '한식' | '분식'): AnswerReply {
  return answer.input.kind === 'meal' ? { ...answer, input: { ...answer.input, cuisine } } : answer;
}

function tagOf(answer: AnswerReply, label: string): ReturnType<typeof seen> {
  return seen(drawingOf(answer, 0), `answer:candidate:${label}`);
}

// Partitions: a kind on screen that no candidate serves, and a kind asked of menus whose dishes have no kind (review of
// PR 441): neither has a chip to show or clear it.
describe('a kind on screen with no chip for it', () => {
  it('recedes no candidate when none serves it', () => {
    const answer = withCuisine(MEAL_ANSWER_MENUS, '분식');

    expect(tagOf(answer, '301동식당')).toMatchObject({ label: { tone: 'minutes', number: 2 } });
    expect(tagOf(answer, '자하연식당 2층')).toMatchObject({ symbol: { role: 'candidate', number: 5 } });
  });

  it('recedes no candidate when the dishes have no kind', () => {
    const plans = MEAL_ANSWER_MENUS.plans.map((plan) =>
      plan.menu === undefined
        ? plan
        : { ...plan, menu: { ...plan.menu, dishes: plan.menu.dishes.map((dish) => ({ ...dish, cuisine: null })) } },
    );
    const answer = withCuisine({ ...MEAL_ANSWER_MENUS, plans }, '한식');

    expect(tagOf(answer, '301동식당')).toMatchObject({ label: { tone: 'minutes', number: 2 } });
    expect(tagOf(answer, '학생회관식당')).toMatchObject({ symbol: { role: 'candidate', number: 3 } });
  });
});

function avatarOf(userId: string): MapAvatar {
  const view = { kind: 'person' as const, id: userId, tone: 'on' as const, name: '김민준', photo: null };
  return {
    id: `friend:${userId}`,
    name: '김민준',
    position: { latitude: 37.46, longitude: 126.95 },
    image: { look: `person:${userId}`, view, uri: null, width: 0, height: 0, anchor: { x: 0.5, y: 1 } },
    glideMs: 0,
  };
}

// Partitions: a Friend a press would add, one in the answer, one whose add is on its way, and any face once sent.
describe('the faces of Friends the answer does not draw', () => {
  const input = MEAL_ANSWER.input;
  const inAnswer = input.people[1]?.userId ?? '';

  it('are faint where a press would add them or the Plan is sent, and lit while in the Plan', () => {
    expect(answerFaceOf(avatarOf('friend-1'), input, null, false)).toMatchObject({ faded: true, addable: true });
    expect(answerFaceOf(avatarOf(inAnswer), input, null, false)).toMatchObject({ selected: true, faded: false });
    expect(answerFaceOf(avatarOf('friend-1'), input, null, true)).toMatchObject({ faded: true });
  });

  it('but the one whose add is on its way, which is lit', () => {
    expect(answerFaceOf(avatarOf('friend-1'), input, 'friend-1', false)).toMatchObject({
      faded: false,
      selected: true,
    });
  });
});
