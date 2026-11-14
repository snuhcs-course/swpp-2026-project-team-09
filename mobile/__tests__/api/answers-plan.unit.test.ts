/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// Partitions of the check of an answer drawn on the map: the main server's answer to "배고파, 민수랑 같이"; each
// checked field left out, null where null is not allowed, or of another type; and null where it is allowed. Expected
// values: main-server `assistant/dto/answer.dto.ts`.

import { inList, inside, omit, type Variant, wrongFields } from '../support/answer-variants';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_PLAN_1 } from '@/api/mock/data/meal-answer-plan-1';
import { MEAL_PLAN_3 } from '@/api/mock/data/meal-answer-plan-3';
import { isAnswerReply } from '@/api/server/plan-answers';

type Shape = Record<string, unknown>;

function shape(value: object): Shape {
  return { ...value };
}

function at<Item>(list: readonly Item[], index: number): Item {
  const item = list[index];
  if (item === undefined) {
    throw new Error(`The copy has no item ${index}`);
  }
  return item;
}

// The plan with a merging point.
const PLAN = shape(MEAL_PLAN_3);
const ANSWER = shape(MEAL_ANSWER);
const INPUT = shape(MEAL_ANSWER.input);
const PERSON = shape(at(MEAL_ANSWER.input.people, 0));
const CHIP = shape(at(MEAL_ANSWER.chips, 2));
const PLACE = shape(MEAL_PLAN_3.place);
const MEETING = shape(MEAL_PLAN_3.meeting ?? {});
const PART = shape(at(MEAL_PLAN_3.parts, 0));
const SUB_QUEST = shape(at(MEAL_PLAN_3.subQuests, 0));
const WORDS = shape(at(at(MEAL_PLAN_3.lines, 0), 0));
const SCENE = shape(MEAL_PLAN_3.scene);
const SCENE_PERSON = shape(at(MEAL_PLAN_3.scene.people, 0));
const SCENE_PLACE = shape(at(MEAL_PLAN_3.scene.places, 0));
const ROUTE = shape(at(MEAL_PLAN_3.scene.routes, 0));
const FLAG = shape(at(MEAL_PLAN_3.scene.flags, 1));
const BAND = shape(MEAL_PLAN_3.band);
const LANE = shape(at(MEAL_PLAN_3.band.lanes, 0));
const BUSY = shape(at(MEAL_PLAN_3.band.lanes[0]?.busy ?? [], 0));
const DROPPED = { place: MEAL_PLAN_1.place, reason: MEAL_PLAN_1.title };
const NO_PLAN = { reason: 'no-fit', lines: MEAL_PLAN_1.lines };

const POSITION_WRONG = [{ latitude: '37.45', longitude: 126.95 }];

// The answer with the one plan given in place of its list's second.
function withPlan(plan: unknown): Shape {
  return { ...ANSWER, plans: [PLAN, plan] };
}

// Variants of a field of the plan, each put in the whole answer.
function inPlan(name: string, variants: readonly Variant[]): Variant[] {
  return inside(ANSWER, 'plans', inList(PLAN, inside(PLAN, name, variants)));
}

// Variants of one item of a list of the plan, after a valid item.
function inPlanList(name: string, valid: unknown, variants: readonly Variant[]): Variant[] {
  return inPlan(name, inList(valid, variants));
}

function inScene(name: string, valid: unknown, variants: readonly Variant[]): Variant[] {
  return inPlan('scene', inside(SCENE, name, inList(valid, variants)));
}

function inBand(name: string, variants: readonly Variant[]): Variant[] {
  return inPlan('band', inside(BAND, name, variants));
}

const ACCEPTED: Variant[] = [
  ["the main server's answer", ANSWER],
  ['a plan without a meeting', withPlan(MEAL_PLAN_1)],
  ['no plan, its reason and lines', { ...ANSWER, plans: [], noPlan: NO_PLAN }],
  ['a dropped place', { ...ANSWER, dropped: [DROPPED] }],
  [
    'a person with a constraint of each kind',
    {
      ...ANSWER,
      input: {
        ...INPUT,
        people: [
          {
            ...PERSON,
            constraints: [
              { kind: 'from', placeId: PLACE.placeId, source: 'asker' },
              { kind: 'notBefore', time: '12:00', source: 'person' },
              { kind: 'leaveBy', time: '12:50', source: 'asker' },
            ],
          },
        ],
      },
    },
  ],
  [
    'a window and a place fixed',
    { ...ANSWER, input: { ...INPUT, window: { from: '12:00', until: '13:00' }, placeId: PLACE.placeId } },
  ],
  [
    'a part of an unknown position, with nothing after',
    withPlan({
      ...PLAN,
      parts: [PART, { ...PART, origin: null, leaveAt: null, walkMinutes: null, leaveBy: null, next: null }],
    }),
  ],
  [
    'a part whose next has no place',
    withPlan({ ...PLAN, parts: [{ ...PART, next: { startAt: '2026-11-17T13:00:00+09:00', place: null } }] }),
  ],
];

const REFUSED: Variant[] = [
  ['null', null],
  ['an answer of words', '12:15 302동식당'],
  ...wrongFields(ANSWER, { input: ['meal'], chips: [CHIP], plans: [PLAN], dropped: [DROPPED], noPlan: ['no-fit'] }, [
    'noPlan',
  ]),
  ...inside(
    ANSWER,
    'input',
    wrongFields(
      INPUT,
      {
        kind: ['study'],
        date: [20_261_117],
        meal: ['breakfast'],
        people: [PERSON, [omit(PERSON, 'userId')]],
        window: [{ from: 12 }, { from: null }],
        placeId: [1],
      },
      ['placeId'],
    ),
  ),
  ...inside(
    ANSWER,
    'input',
    inside(
      INPUT,
      'people',
      inList(
        PERSON,
        wrongFields(PERSON, { userId: [1], constraints: [[{ kind: 'after', time: '12:00', source: 'asker' }]] }),
      ),
    ),
  ),
  ...inside(
    ANSWER,
    'input',
    inside(INPUT, 'people', [
      ['a constraint without its source', [{ ...PERSON, constraints: [{ kind: 'leaveBy', time: '12:50' }] }]],
      ['a constraint by someone else', [{ ...PERSON, constraints: [{ kind: 'from', placeId: 'p', source: 'ai' }] }]],
      ['a from without its place', [{ ...PERSON, constraints: [{ kind: 'from', source: 'asker' }] }]],
    ]),
  ),
  ...inside(ANSWER, 'chips', inList(CHIP, wrongFields(CHIP, { kind: ['place'], text: [1], userId: [1] }, ['userId']))),
  ...inside(
    ANSWER,
    'dropped',
    inList(
      DROPPED,
      wrongFields(DROPPED, { place: [omit(PLACE, 'label')], reason: [1] }).concat([
        ['a place without its point', { ...DROPPED, place: { ...PLACE, latitude: '37.45' } }],
      ]),
    ),
  ),
  ...inside(
    ANSWER,
    'noPlan',
    wrongFields(NO_PLAN, { reason: ['none'], lines: [[{ text: '없어요', strong: false }], [[{ text: 1 }]]] }),
  ),
  ...inside(
    ANSWER,
    'plans',
    inList(
      PLAN,
      wrongFields(
        PLAN,
        {
          id: [1],
          title: [1],
          place: ['학생회관식당'],
          startAt: [1],
          endAt: [1],
          togetherMinutes: ['26'],
          meeting: ['301동'],
          parts: [PART],
          subQuests: [SUB_QUEST],
          lines: [WORDS, [WORDS]],
          basis: ['민수 12:15', [1]],
          scene: [[]],
          band: ['12:15–12:43'],
        },
        ['meeting'],
      ),
    ),
  ),
  ...inPlan(
    'place',
    wrongFields(PLACE, { placeId: [1], label: [1], latitude: ['37.45932'], longitude: ['126.95058'] }),
  ),
  ...inPlan('meeting', wrongFields(MEETING, { place: [omit(PLACE, 'placeId')], at: [1], userIds: ['u1', [1]] })),
  ...inPlanList(
    'parts',
    PART,
    wrongFields(
      PART,
      {
        userId: [1],
        name: [1],
        me: ['true'],
        origin: [{ place: PLACE, basis: 'guess' }, { basis: 'timetable' }],
        leaveAt: [1],
        walkMinutes: ['15'],
        leaveBy: [1],
        next: [
          { startAt: 1, place: null },
          { startAt: '2026-11-17T13:00:00+09:00', place: '24동' },
        ],
      },
      ['origin', 'leaveAt', 'walkMinutes', 'leaveBy', 'next'],
    ),
  ),
  ...inPlanList('subQuests', SUB_QUEST, wrongFields(SUB_QUEST, { at: [1], placeId: [1], title: [1] })),
  ...inPlanList(
    'lines',
    [WORDS],
    [
      ['words without their text', [omit(WORDS, 'text')]],
      ['words of no strength', [omit(WORDS, 'strong')]],
      ['words strong in words', [{ ...WORDS, strong: 'true' }]],
      ['a line of words', '12:33 학생회관식당'],
    ],
  ),
  ...inPlan(
    'scene',
    wrongFields(SCENE, { people: [SCENE_PERSON], places: [SCENE_PLACE], routes: [ROUTE], flags: [FLAG] }),
  ),
  ...inScene(
    'people',
    SCENE_PERSON,
    wrongFields(
      SCENE_PERSON,
      { userId: [1], name: [1], me: ['true'], at: POSITION_WRONG, source: ['guess'], tag: [1] },
      ['tag'],
    ),
  ),
  ...inScene(
    'places',
    SCENE_PLACE,
    wrongFields(SCENE_PLACE, { place: [omit(PLACE, 'longitude')], role: ['start'], tag: [1] }, ['tag']),
  ),
  ...inScene(
    'routes',
    ROUTE,
    wrongFields(ROUTE, { userId: [1], role: ['them'], from: POSITION_WRONG, to: POSITION_WRONG, minutes: ['3'] }),
  ),
  ...inScene('flags', FLAG, wrongFields(FLAG, { at: POSITION_WRONG, text: [1], role: ['start'] })),
  ...inPlan(
    'band',
    wrongFields(BAND, {
      range: [{ startAt: 1, endAt: '2026-11-17T13:30:00+09:00' }],
      now: [1],
      lanes: [LANE],
      startAt: [1],
      endAt: [1],
      text: [1],
    }),
  ),
  ...inBand('lanes', inList(LANE, wrongFields(LANE, { userId: [1], name: [1], busy: [BUSY] }))),
  ...inBand('lanes', [['a busy time without its end', [{ ...LANE, busy: [omit(BUSY, 'endAt')] }]]]),
];

describe('isAnswerReply', () => {
  it.each(ACCEPTED)('%s → accepted', (_, answer) => {
    expect(isAnswerReply(answer)).toBe(true);
  });
  it.each(REFUSED)('%s → refused', (_, answer) => {
    expect(isAnswerReply(answer)).toBe(false);
  });
});
