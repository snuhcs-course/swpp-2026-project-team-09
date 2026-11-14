/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_FIXED_START, MEAL_ANSWER_THREE } from '@/api/mock/data/meal-answers';
import { color } from '@/design-system';
import { drawingOf } from '@/features/assistant/answer-marks';
import { JIEUN_ID, label, ME_ID, MINSU_ID, NEXT_CLASS, seen } from '../support/answer-marks';

// Partitions of the first Plan of the answer for two people: a person and a candidate at one point, and a Friend and
// the pick at one point. Expected values: the
// brief's worked example, from the stored answer to "배고파, 민수랑 같이".
describe('the marks of the answer for two people, its first Plan', () => {
  const drawing = drawingOf(MEAL_ANSWER, 0);

  it("draws the User's dot at 301동, with the candidate 301동식당's number in its label at the left", () => {
    expect(seen(drawing, 'answer:me')).toEqual({
      name: '나 · 3분',
      symbol: { type: 'me' },
      label: label('right', 'person', '나 · 3분'),
      planId: null,
    });
    expect(seen(drawing, 'answer:candidate:301동식당')).toEqual({
      name: '후보 2 · 301동식당',
      symbol: null,
      label: label('left', 'candidate', '301동식당', { number: 2 }),
      planId: '301동식당',
    });
  });

  it("draws 민수's dashed face at 302동, and the pick's number, title, and time below it", () => {
    expect(seen(drawing, `answer:person:${MINSU_ID}`)).toEqual({
      name: '민수',
      symbol: { type: 'face', name: '민수', dashed: true },
      label: label('right', 'person', '민수'),
      planId: null,
    });
    expect(seen(drawing, 'answer:pick')).toEqual({
      name: '302동식당 · 12:15 점심',
      symbol: null,
      label: label('below', 'pick', '302동식당', { line: '12:15 점심', number: 1 }),
      planId: null,
    });
  });
});

// Partitions of the same Plan's points that stand alone: a candidate whose left is taken by a neighbour, the other
// candidates, and the next Class. Expected values: the brief's worked example.
describe('the marks of the answer for two people, its first Plan, away from the people', () => {
  const drawing = drawingOf(MEAL_ANSWER, 0);

  it('puts 학생회관식당 at the right, since 24동 stands 61 metres to its left', () => {
    expect(seen(drawing, 'answer:candidate:학생회관식당')).toEqual({
      name: '후보 3 · 학생회관식당',
      symbol: { type: 'dot', role: 'candidate', number: 3 },
      label: label('right', 'candidate', '학생회관식당'),
      planId: '학생회관식당',
    });
  });

  it('draws the other candidates and the next Class with their labels at the left', () => {
    expect(seen(drawing, 'answer:candidate:3식당')).toMatchObject({
      symbol: { type: 'dot', role: 'candidate', number: 4 },
      label: { side: 'left' },
    });
    expect(seen(drawing, 'answer:candidate:자하연식당 2층')).toMatchObject({
      symbol: { type: 'dot', role: 'candidate', number: 5 },
      label: { side: 'left' },
    });
    expect(seen(drawing, NEXT_CLASS)).toEqual({
      name: '13:00 수업 · 24동',
      symbol: { type: 'dot', role: 'next', number: null },
      label: label('left', 'next', '13:00 수업 · 24동'),
      planId: null,
    });
  });
});

// Partitions of the same Plan's lines, points, people, and drawing order: a route of the User and one to the next
// Class. Expected values: the brief's rule of lines and order, and the stored answer's routes.
describe('the lines, points, and order of the answer for two people, its first Plan', () => {
  const drawing = drawingOf(MEAL_ANSWER, 0);

  it("draws the User's line in navy and the way to the next Class fainter and thinner", () => {
    expect(drawing.lines).toEqual([
      {
        id: 'answer:route:0',
        points: [
          { latitude: 37.45016, longitude: 126.95259 },
          { latitude: 37.44887, longitude: 126.95265 },
        ],
        style: { color: color.snuBlue, width: 5 },
      },
      {
        id: 'answer:route:1',
        points: [
          { latitude: 37.44887, longitude: 126.95265 },
          { latitude: 37.45942, longitude: 126.94989 },
        ],
        style: { color: color.borderStrong, width: 3 },
      },
    ]);
  });

  it('draws the two people and fits the camera to every place of the scene', () => {
    expect(drawing.userIds).toEqual([ME_ID, MINSU_ID]);
    expect(drawing.points).toEqual(
      expect.arrayContaining([
        { latitude: 37.45016, longitude: 126.95259 },
        { latitude: 37.44887, longitude: 126.95265 },
        { latitude: 37.45932, longitude: 126.95058 },
        { latitude: 37.45647, longitude: 126.94851 },
        { latitude: 37.46098, longitude: 126.95252 },
        { latitude: 37.45942, longitude: 126.94989 },
      ]),
    );
  });

  it('draws the pick on top, then the people, then the next Class, then the candidates', () => {
    const order = (id: string): number => drawing.things.find((thing) => thing.id === id)?.order ?? Number.NaN;

    expect(order('answer:pick')).toBeGreaterThan(order('answer:me'));
    expect(order('answer:me')).toBeGreaterThan(order(`answer:person:${MINSU_ID}`));
    expect(order(`answer:person:${MINSU_ID}`)).toBeGreaterThan(order(NEXT_CLASS));
    expect(order(NEXT_CLASS)).toBeGreaterThan(order('answer:candidate:301동식당'));
    expect(new Set(drawing.things.map((thing) => thing.order)).size).toBe(drawing.things.length);
  });
});

// Partitions of the third Plan of the answer for two people: a Merging Point with its flag at the User's point, two
// candidates under the people's points, and three lines of three kinds. Expected values: the brief's worked example
// and ticket 02's acceptance criteria.
describe('the marks of the answer for two people, its third Plan', () => {
  const drawing = drawingOf(MEAL_ANSWER, 2);

  it('at 301동: the User at the right, 301동식당 at the left, and the flag above', () => {
    expect(seen(drawing, 'answer:me')).toMatchObject({ name: '나 · 15분', label: { side: 'right' } });
    expect(seen(drawing, 'answer:candidate:301동식당')).toMatchObject({
      name: '후보 2 · 301동식당',
      symbol: null,
      label: { side: 'left', number: 2 },
    });
    expect(seen(drawing, 'answer:meeting:1')).toEqual({
      name: '12:18 민수와 만남',
      symbol: null,
      label: label('above', 'meeting', '12:18 민수와 만남'),
      planId: null,
    });
  });

  it("at 302동: 민수's face at the right and 302동식당 at the left", () => {
    expect(seen(drawing, `answer:person:${MINSU_ID}`)).toMatchObject({
      name: '민수 · 18분',
      symbol: { type: 'face' },
      label: { side: 'right' },
    });
    expect(seen(drawing, 'answer:candidate:302동식당')).toMatchObject({
      name: '후보 1 · 302동식당',
      symbol: null,
      label: { side: 'left', number: 1 },
      planId: '302동식당',
    });
  });

  it("at 학생회관: the pick's own dot with its number, and its words below", () => {
    expect(seen(drawing, 'answer:pick')).toEqual({
      name: '학생회관식당 · 12:33 점심',
      symbol: { type: 'dot', role: 'pick', number: 3 },
      label: label('below', 'pick', '학생회관식당', { line: '12:33 점심' }),
      planId: null,
    });
    expect(seen(drawing, 'answer:candidate:3식당')).toMatchObject({ symbol: { number: 4 }, label: { side: 'left' } });
    expect(seen(drawing, 'answer:candidate:자하연식당 2층')).toMatchObject({ label: { side: 'left' } });
    expect(seen(drawing, NEXT_CLASS)).toMatchObject({ label: { side: 'left' } });
  });
});

// Partitions of the third Plan's lines: one of each kind. Expected values: the brief's rule of lines and ticket 02's
// acceptance criteria.
describe('the lines of the answer for two people, its third Plan', () => {
  const drawing = drawingOf(MEAL_ANSWER, 2);

  it("draws 민수's line in the Friend colour, the User's in navy, and the way to the next Class", () => {
    expect(drawing.lines.map(({ id, style }) => ({ id, style }))).toEqual([
      { id: 'answer:route:0', style: { color: color.friend, width: 4 } },
      { id: 'answer:route:1', style: { color: color.snuBlue, width: 5 } },
      { id: 'answer:route:2', style: { color: color.borderStrong, width: 3 } },
    ]);
  });
});

function sorted(points: readonly { latitude: number; longitude: number }[]): string[] {
  return [...new Set(points.map(({ latitude, longitude }) => `${latitude},${longitude}`))].toSorted();
}

// Partitions of what the camera keeps in view when not everything fits: a Plan whose pick stands with a person (the
// first) and one whose pick stands alone and whose flag stands at the User's point (the third); an index out of range.
// Expected values: the stored answer's scene, people, pick, next Class, and flags, without the other candidates.
describe("the Plan's own points and its pick", () => {
  const AT_301 = { latitude: 37.45016, longitude: 126.95259 };
  const AT_302 = { latitude: 37.44887, longitude: 126.95265 };
  const STUDENT_CENTER = { latitude: 37.45932, longitude: 126.95058 };
  const AT_24 = { latitude: 37.45942, longitude: 126.94989 };

  it('for the first Plan, are the people at 301동 and 302동, the pick at 302동, and 24동', () => {
    const drawing = drawingOf(MEAL_ANSWER, 0);

    expect(sorted(drawing.own)).toEqual(sorted([AT_301, AT_302, AT_24]));
    expect(drawing.pick).toEqual(AT_302);
  });

  it('for the third Plan, are the people, the pick at 학생회관, 24동, and the meeting flag at 301동', () => {
    const drawing = drawingOf(MEAL_ANSWER, 2);

    expect(sorted(drawing.own)).toEqual(sorted([AT_301, AT_302, STUDENT_CENTER, AT_24]));
    expect(drawing.pick).toEqual(STUDENT_CENTER);
  });

  it('are none for an index out of range', () => {
    const drawing = drawingOf(MEAL_ANSWER, MEAL_ANSWER.plans.length);

    expect(drawing.own).toEqual([]);
    expect(drawing.pick).toBeNull();
  });
});

// Partitions of the answers for three people and with a fixed start: Restaurants that do not fit, under a person's
// point and alone at their own. Expected values: the brief's worked example.
describe('the marks of an answer with Restaurants that do not fit', () => {
  it('for three people, puts the reasons at the left of the people who stand there', () => {
    const drawing = drawingOf(MEAL_ANSWER_THREE, 0);

    expect(seen(drawing, 'answer:meeting:1')).toMatchObject({ name: '12:18 민수와 만남', label: { side: 'above' } });
    expect(seen(drawing, 'answer:dropped:301동식당')).toEqual({
      name: '301동식당 · 지은은 13분밖에 못 있어요',
      symbol: null,
      label: label('left', 'dropped', '301동식당 · 지은은 13분밖에 못 있어요'),
      planId: null,
    });
    expect(seen(drawing, 'answer:dropped:302동식당')).toMatchObject({ label: { side: 'left' } });
    expect(seen(drawing, `answer:person:${JIEUN_ID}`)).toMatchObject({
      name: '지은 · 5분',
      symbol: { type: 'face', name: '지은', dashed: true },
      label: { side: 'right' },
    });
    expect(seen(drawing, 'answer:pick')).toMatchObject({
      symbol: { number: 1 },
      label: { side: 'below', line: '12:33 점심' },
    });
    expect(seen(drawing, 'answer:candidate:자하연식당 2층')).toMatchObject({ symbol: { number: 2 } });
    expect(seen(drawing, 'answer:candidate:3식당')).toMatchObject({ symbol: { number: 3 }, label: { side: 'left' } });
    expect(drawing.lines).toHaveLength(4);
  });

  it('with a fixed start, draws a Restaurant that does not fit alone at its point with its faint dot', () => {
    const drawing = drawingOf(MEAL_ANSWER_FIXED_START, 0);

    expect(seen(drawing, 'answer:meeting:1')).toMatchObject({ name: '12:25 민수와 만남' });
    expect(seen(drawing, 'answer:pick')).toMatchObject({ label: { line: '12:40 점심' } });
    expect(seen(drawing, 'answer:candidate:자하연식당 2층')).toMatchObject({
      symbol: { number: 2 },
      label: { side: 'left' },
    });
    expect(seen(drawing, 'answer:dropped:301동식당')).toMatchObject({ symbol: null, label: { side: 'left' } });
    expect(seen(drawing, 'answer:dropped:302동식당')).toMatchObject({ symbol: null, label: { side: 'left' } });
    expect(seen(drawing, 'answer:dropped:3식당')).toEqual({
      name: '3식당 · 14분밖에 못 있어요',
      symbol: { type: 'dot', role: 'dropped', number: null },
      label: label('left', 'dropped', '3식당 · 14분밖에 못 있어요'),
      planId: null,
    });
  });
});
