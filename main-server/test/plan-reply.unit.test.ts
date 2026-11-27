/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type MealInput, type PlacePoint, type Plan } from '../src/assistant/dto/answer.dto.js';
import { type CuisineWord as Cuisine } from '../src/menus/cuisine-words.js';
import { withoutWalkSentences, wordlessMealSentence } from '../src/assistant/gathering/plan-reply.js';

// The reply of a meal's answer keeps to the one sentence about the first plan: a later sentence that gives a walk in
// minutes goes, since the app writes the ways and their minutes on the map (the user's phone, 2026-11-26). Expected
// values: the reply as the rules allow it.

// Partitions: a later sentence with a walk, said as 도보, 걸어서, and 걸려; the sentences the rules allow after the
// first; a first sentence with a walk; a reply with no Plan drawn.
describe("A meal reply's sentences", () => {
  it.each([
    ['가장 가까운 예술계식당을 추천해요. 83동에서 도보 3분이에요.'],
    ['가장 가까운 예술계식당을 추천해요. 걸어서 3분이면 가요.'],
    ['가장 가까운 예술계식당을 추천해요. 83동에서 3분 걸려요.'],
  ])('drops a later sentence that gives a walk: %s', (text) => {
    expect(withoutWalkSentences(text, true)).toBe('가장 가까운 예술계식당을 추천해요.');
  });

  it.each([
    ['이미 민수와 12:16 302동식당 점심이 있어요. 바꿀까요?'],
    ['15:30 302동 수업까지 가장 덜 걷는 3식당을 추천해요. 302동식당과 301동식당은 13:30엔 나서야 해서 25분뿐이에요.'],
    ['가장 가까운 301동식당을 추천해요. 어디서 출발해요?'],
    ['83동에서 도보 3분인 예술계식당을 추천해요.'],
  ])('keeps a reply the rules allow: %s', (text) => {
    expect(withoutWalkSentences(text, true)).toBe(text);
  });

  it('leaves a reply with no Plan drawn as it is', () => {
    const way = '정문까지 걸어서 5분이에요. 셔틀은 2분 뒤에 와요.';

    expect(withoutWalkSentences(way, false)).toBe(way);
  });
});

// The sentence a meal reply says when the model wrote none (the user's phone, 2026-11-26: the plan's own line stood in
// its place): the rules' one sentence, made from the plans. Expected values: the rules' examples of why the first plan
// comes first. Partitions: why — the kind of food asked, the least walking from a known origin, the least walking on to
// the next Class from an unknown one, the earliest start with neither, nothing when another plan walks less; the name's
// particle — a final consonant, none, a bracketed part; no sentence — no plan, a menu's answer, a meet, no answer.
const ME = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const DAY = '2027-03-02';
const AT = { latitude: 0, longitude: 0 };
const point = (label: string): PlacePoint => ({ placeId: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', label, ...AT });

interface Way {
  // Where the User sets out from, null when not known.
  from: string | null;
  walk: number;
  // The User's next Class, its start and its Place, with the walk on to it.
  next?: { start: string; place: string; walk: number };
  cuisine?: Cuisine;
}

function planOf(id: string, { from, walk, next, cuisine }: Way): Plan {
  return {
    id,
    title: `${id}에서 점심`,
    place: point(id),
    startAt: `${DAY}T11:30:00+09:00`,
    endAt: `${DAY}T12:30:00+09:00`,
    togetherMinutes: 60,
    meeting: null,
    parts: [
      {
        userId: ME,
        name: '나',
        me: true,
        origin: from === null ? null : { place: point(from), basis: 'timetable' },
        leaveAt: null,
        walkMinutes: from === null ? null : walk,
        leaveBy: null,
        next: next === undefined ? null : { startAt: `${DAY}T${next.start}:00+09:00`, place: point(next.place) },
      },
    ],
    subQuests: [],
    lines: [],
    basis: [],
    scene: {
      people: [],
      places: next === undefined ? [] : [{ place: point(next.place), role: 'next', tag: `${next.start} 수업` }],
      routes: next === undefined ? [] : [{ userId: ME, role: 'next', from: AT, to: AT, minutes: next.walk }],
      flags: [],
    },
    band: {
      range: { startAt: `${DAY}T10:30:00+09:00`, endAt: `${DAY}T13:00:00+09:00` },
      now: `${DAY}T09:00:00+09:00`,
      lanes: [],
      startAt: `${DAY}T11:30:00+09:00`,
      endAt: `${DAY}T12:30:00+09:00`,
      text: '11:30–12:30 · 식사 60분',
    },
    menu: { price: null, dishes: [{ name: '돌솥비빔밥', price: 6500, cuisine: cuisine ?? null }], others: 0 },
  };
}

function answerOf(plans: Plan[], { cuisine, opened }: { cuisine?: Cuisine; opened?: string } = {}): AnswerReply {
  const input: MealInput = {
    kind: 'meal',
    date: DAY,
    meal: 'lunch',
    people: [{ userId: ME, constraints: [] }],
    window: { from: null, until: null },
    placeId: null,
    ...(cuisine === undefined ? {} : { cuisine }),
  };
  return { input, chips: [], plans, dropped: [], noPlan: null, ...(opened === undefined ? {} : { opened }) };
}

const KNOWN = { from: '302동', walk: 4 };
const NEXT_CLASS = { from: null, walk: 0, next: { start: '13:00', place: '302동', walk: 4 } };

// Each reason, with the answer and the sentence.
const REASONS: [string, AnswerReply, string][] = [
  [
    'the kind of food asked',
    answerOf([planOf('학생회관식당', { ...KNOWN, walk: 9, cuisine: '한식' }), planOf('301동식당', KNOWN)], {
      cuisine: '한식',
    }),
    '한식이 나오는 학생회관식당을 추천해요.',
  ],
  [
    'the least walking from where the User is',
    answerOf([planOf('301동식당', KNOWN), planOf('학생회관식당', { ...KNOWN, walk: 12 })]),
    '가장 덜 걷는 301동식당을 추천해요.',
  ],
  [
    'the least walking on to the next Class',
    answerOf([
      planOf('301동식당', NEXT_CLASS),
      planOf('3식당', { ...NEXT_CLASS, next: { ...NEXT_CLASS.next, walk: 12 } }),
    ]),
    '13:00 302동 수업까지 가장 덜 걷는 301동식당을 추천해요.',
  ],
  [
    'the earliest start with neither origin nor next item',
    answerOf([planOf('두레미담', { from: null, walk: 0 })]),
    '어디서 출발하는지 몰라서 가장 일찍 여는 두레미담을 추천해요.',
  ],
  [
    'nothing when another plan walks less',
    answerOf([planOf('아워홈(901동)', { ...KNOWN, walk: 13 }), planOf('301동식당', KNOWN)]),
    '아워홈(901동)을 추천해요.',
  ],
  [
    'a name with no final consonant',
    answerOf([planOf('두레미담 카페', KNOWN)]),
    '가장 덜 걷는 두레미담 카페를 추천해요.',
  ],
];

describe("A meal reply's sentence when the model wrote none", () => {
  it.each(REASONS)('says why the first plan comes first: %s', (_why, answer, sentence) => {
    expect(wordlessMealSentence(answer)).toBe(sentence);
  });

  it("says nothing for an answer with no plan, a menu's answer, a meet, or no answer", () => {
    const meet: AnswerReply = {
      ...answerOf([planOf('자하연', KNOWN)]),
      input: { kind: 'meet', date: DAY, people: [], window: { from: null, until: null }, placeId: null },
    };

    expect(wordlessMealSentence(answerOf([]))).toBeNull();
    expect(wordlessMealSentence(answerOf([planOf('301동식당', KNOWN)], { opened: '301동식당' }))).toBeNull();
    expect(wordlessMealSentence(meet)).toBeNull();
    expect(wordlessMealSentence(null)).toBeNull();
  });
});
