/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, MapScene } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_PLAN_1 } from '@/api/mock/data/meal-answer-plan-1';
import { drawingOf, looksOf, nearOwnMark } from '@/features/assistant/answer-marks';
import { lookName } from '@/map/marker-looks';
import { MINSU_ID, NEXT_CLASS, seen, sideOf } from '../support/answer-marks';

// Distances are built with the spec's flat map ("Where the words go"): a degree of latitude is 111,320 metres, and a
// degree of longitude that times the cosine of the latitude. The code counts with the same definition.
const METRES_PER_DEGREE = 111_320;
const AT_301 = { latitude: 37.45016, longitude: 126.95259 };
const AT_302 = { latitude: 37.44887, longitude: 126.95265 };
const AT_STUDENT_HALL = { latitude: 37.45932, longitude: 126.95058 };

// The stored answer for two people, its first Plan's scene changed as `change` says.
function withScene(change: (scene: MapScene) => MapScene): AnswerReply {
  return {
    ...MEAL_ANSWER,
    plans: [{ ...MEAL_PLAN_1, scene: change(MEAL_PLAN_1.scene) }, ...MEAL_ANSWER.plans.slice(1)],
  };
}

function north(from: LatLng, metres: number): LatLng {
  return { latitude: from.latitude + metres / METRES_PER_DEGREE, longitude: from.longitude };
}

function west(from: LatLng, metres: number): LatLng {
  const perDegree = METRES_PER_DEGREE * Math.cos((from.latitude * Math.PI) / 180);
  return { latitude: from.latitude, longitude: from.longitude - metres / perDegree };
}

function candidateAt(at: LatLng, label: string): MapScene['places'][number] {
  return { place: { placeId: `test-${label}`, label, ...at }, role: 'candidate', tag: label };
}

// Partitions: a point whose label sides are all taken, and a candidate whose Place has no Plan. Expected values: the
// brief's rule of sides; the User takes the right of 301동 and 301동식당 its left.
describe('a point where every side of a label is taken', () => {
  // Three candidates are added at 301동, none of them a Place of a Plan.
  const drawing = drawingOf(
    withScene((scene) => ({
      ...scene,
      places: [...scene.places, ...['추가 1', '추가 2', '추가 3'].map((name) => candidateAt(AT_301, name))],
    })),
    0,
  );

  it('gives the added candidates the free sides of their list in order', () => {
    expect(sideOf(drawing, 'answer:candidate:추가 1')).toBe('below');
    expect(sideOf(drawing, 'answer:candidate:추가 2')).toBe('above');
  });

  it('keeps a thing whose list has no side left without a label, with its name', () => {
    expect(seen(drawing, 'answer:candidate:추가 3')).toEqual({
      name: '추가 3',
      symbol: null,
      label: null,
      planId: null,
    });
  });

  it('gives a candidate without a Plan no number and no press', () => {
    expect(seen(drawing, 'answer:candidate:추가 1')).toMatchObject({
      name: '추가 1',
      planId: null,
      label: { number: null },
    });
  });
});

// Partitions: a point alone whose every side is blocked by a neighbouring point, none taken at the point itself.
// Expected values: the spec's rule, "the first side of its list that no earlier label took"; a candidate's list
// starts at the left.
describe('a label whose every side is blocked by a neighbour', () => {
  it('takes the first side of its list', () => {
    // Four candidates without a Plan are added around 학생회관, each within the reach of one side: 100 metres to the
    // left and to the right, and 60 metres above and below.
    const around = [
      west(AT_STUDENT_HALL, 100),
      west(AT_STUDENT_HALL, -100),
      north(AT_STUDENT_HALL, 60),
      north(AT_STUDENT_HALL, -60),
    ];
    const drawing = drawingOf(
      withScene((scene) => ({
        ...scene,
        places: [...scene.places, ...around.map((at, index) => candidateAt(at, `둘레 ${index}`))],
      })),
      0,
    );

    expect(sideOf(drawing, 'answer:candidate:학생회관식당')).toBe('left');
  });
});

// Partitions: two things just within 15 metres of each other, and 16 metres apart. Expected values: the brief's rule
// of one symbol at a point.
describe('things that stand at one point', () => {
  it.each([
    ['15 metres apart stand at one point: only the Friend draws a symbol', 14.99, null, 1],
    ['16 metres apart stand at two: the pick draws its own dot', 16, { type: 'dot', role: 'pick', number: 1 }, null],
  ] as const)('%s', (_, metres, symbol, number) => {
    // 민수 is moved north of 302동, where the pick stands.
    const answer = withScene((scene) => ({
      ...scene,
      people: scene.people.map((person) => (person.me ? person : { ...person, at: north(AT_302, metres) })),
    }));

    const pick = seen(drawingOf(answer, 0), 'answer:pick');

    expect(pick.symbol).toEqual(symbol);
    expect(pick.label?.number).toBe(number);
    expect(seen(drawingOf(answer, 0), `answer:person:${MINSU_ID}`).symbol).toMatchObject({ type: 'face' });
  });
});

// Partitions: a neighbour at the left edge of a side label's reach (400 metres sideways, 50 up or down), just inside
// and just outside. Expected values: the brief's reach; 학생회관식당 takes its left unless a neighbour is there.
describe("a neighbour at the edge of a label's reach", () => {
  it.each([
    ['399.99 metres to the left', 'right', west(AT_STUDENT_HALL, 399.99)],
    ['400.01 metres to the left', 'left', west(AT_STUDENT_HALL, 400.01)],
    ['61 metres to the left and 49.9 up', 'right', north(west(AT_STUDENT_HALL, 61), 49.9)],
    ['61 metres to the left and 50.1 up', 'left', north(west(AT_STUDENT_HALL, 61), 50.1)],
  ] as const)('with the next Class %s, 학생회관식당 is labelled at the %s', (_, side, at) => {
    // The next Class's Place is moved; it stands 61 metres to the left of 학생회관 in the stored answer.
    const answer = withScene((scene) => ({
      ...scene,
      places: scene.places.map((place) =>
        place.role === 'next' ? { ...place, place: { ...place.place, ...at } } : place,
      ),
    }));

    expect(sideOf(drawingOf(answer, 0), 'answer:candidate:학생회관식당')).toBe(side);
  });
});

// Partitions: a flag of a Place away from the pick. Expected values: the brief's rule for such a flag.
describe("a Place's flag away from the pick", () => {
  it('is drawn like a meeting flag in the pick tone, and the pick has no line', () => {
    // The flag "12:15 점심" is moved from 302동 to 학생회관.
    const drawing = drawingOf(
      withScene((scene) => ({ ...scene, flags: scene.flags.map((flag) => ({ ...flag, at: AT_STUDENT_HALL })) })),
      0,
    );

    expect(seen(drawing, 'answer:meeting:0')).toMatchObject({
      name: '12:15 점심',
      symbol: null,
      label: { tone: 'pick' },
    });
    expect(seen(drawing, 'answer:pick')).toMatchObject({ name: '302동식당', label: { line: null } });
    expect(sideOf(drawing, NEXT_CLASS)).toBe('left');
  });
});

// Partitions: a position at an own mark, and at each edge of its clear room (150 metres sideways, 120 up or down),
// just inside and just outside; a mark that is not the Plan's own; a drawing of nothing. Expected values: the spec's
// reach of a label above or below. The User stands at 301동, and the other own marks of the first Plan are 143
// metres south of it or more than a kilometre north.
describe("a position near one of the Plan's own marks", () => {
  const drawing = drawingOf(MEAL_ANSWER, 0);

  it.each([
    ['where the User stands', AT_301, true],
    ['149.99 metres to the left', west(AT_301, 149.99), true],
    ['150.01 metres to the left', west(AT_301, 150.01), false],
    ['119.99 metres up', north(AT_301, 119.99), true],
    ['120.01 metres up', north(AT_301, 120.01), false],
  ] as const)('%s', (_, position, near) => {
    expect(nearOwnMark(drawing, position)).toBe(near);
  });

  it('is not near for a candidate, which is not of the Plan itself, or for a drawing of nothing', () => {
    // 3식당 is a candidate of the first Plan, far from the Plan's own marks.
    const candidate = drawing.things.find(({ id }) => id === 'answer:candidate:3식당');

    expect(candidate).toBeDefined();
    expect(nearOwnMark(drawing, candidate?.position ?? AT_301)).toBe(false);
    expect(nearOwnMark(drawingOf(MEAL_ANSWER, 5), AT_301)).toBe(false);
  });
});

// Partitions: an answer without Plans, an index equal to the number of Plans, a negative index, and the looks of
// every Plan. Expected values: the brief's contract of `drawingOf` and `looksOf`.
describe('an answer that draws nothing', () => {
  const nothing = { things: [], lines: [], points: [], own: [], pick: null, userIds: [] };

  it('draws nothing for an answer with no Plan', () => {
    // The stored answer's Plans are taken out, and its noPlan set, as the server answers when nothing fits.
    const answer: AnswerReply = {
      ...MEAL_ANSWER,
      plans: [],
      noPlan: { reason: 'no-fit', lines: [[{ text: '맞는 식당이 없어요', strong: false }]] },
    };

    expect(drawingOf(answer, 0)).toEqual(nothing);
    expect(looksOf(answer)).toEqual([]);
  });

  it('draws nothing for an index equal to the number of Plans, or below 0', () => {
    expect(drawingOf(MEAL_ANSWER, 5)).toEqual(nothing);
    expect(drawingOf(MEAL_ANSWER, -1)).toEqual(nothing);
  });

  it("asks for the looks of every Plan's drawing, each once", () => {
    const names = looksOf(MEAL_ANSWER).map((look) => lookName(look));
    const drawn = MEAL_ANSWER.plans.flatMap((_, index) =>
      drawingOf(MEAL_ANSWER, index).things.map(({ look }) => lookName(look)),
    );

    expect(new Set(names).size).toBe(names.length);
    expect(new Set(names)).toEqual(new Set(drawn));
  });
});
