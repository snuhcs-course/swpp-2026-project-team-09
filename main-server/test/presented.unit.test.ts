/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type Lookup, type MealInput, type PlanInput } from '../src/assistant/dto/answer.dto.js';
import { type Presented } from '../src/assistant/feature.js';
import {
  clearDrawn,
  presentAnswer,
  presentLookup,
  requestKey,
  reviseAnswer,
  withdrawAnswer,
} from '../src/assistant/presented.js';

// What a reply draws on the map changes only through these helpers (P05 ticket 72): an answer takes the map from a
// Lookup and the layer buttons, a Lookup from an answer, and a withdrawn answer also takes the plan on screen off it.
// Beside the one slot every app reads, the reply keeps one answer per request of the message (P05 ticket 73).

const ME = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const FRIEND = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';

const events = (date: string, eventIds: string[] | null = null): PlanInput => ({ kind: 'events', date, eventIds });

const meal = (date: string, which: MealInput['meal'], from: string | null = null): MealInput => ({
  kind: 'meal',
  date,
  meal: which,
  people: [{ userId: ME, constraints: [] }],
  window: { from, until: null },
  placeId: null,
});

const study = (date: string, friends: string[] = []): PlanInput => ({
  kind: 'study',
  date,
  what: 'quiet',
  people: [ME, ...friends].map((userId) => ({ userId, constraints: [] })),
  together: false,
  window: { from: null, until: null },
  minutes: null,
  chosen: { seatSpaceId: null, roomSpaceId: null },
  area: null,
});

const answerOf = (input: PlanInput): AnswerReply => ({ input, chips: [], plans: [], dropped: [], noPlan: null });

const answer = (date: string): AnswerReply => answerOf(events(date));

const lookup: Lookup = {
  kind: 'day',
  chips: [],
  lines: [],
  basis: [],
  scene: { people: [], places: [], routes: [], flags: [] },
  band: null,
  actions: [],
};

const fresh = (): Presented => ({
  mapButtons: ['dining'],
  cards: [],
  proposal: null,
  answer: null,
  lookup: null,
  refusal: null,
});

describe('What a reply draws', () => {
  it('an answer replaces a Lookup and the layer buttons', () => {
    const presented = { ...fresh(), lookup };
    presentAnswer(presented, answer('2026-11-27'));
    expect(presented).toMatchObject({ answer: answer('2026-11-27'), lookup: null, mapButtons: [] });
  });

  it('a Lookup replaces an answer and the layer buttons, unless it keeps the buttons', () => {
    const presented = { ...fresh(), answer: answer('2026-11-27') };
    presentLookup(presented, lookup, { keepsButtons: true });
    expect(presented).toMatchObject({ answer: null, lookup, mapButtons: ['dining'] });
    presentLookup(presented, lookup);
    expect(presented.mapButtons).toEqual([]);
  });

  it('a withdrawn answer clears the plan on screen; clearing leaves it', () => {
    const withdrawn = { ...fresh(), answer: answer('2026-11-27') };
    withdrawAnswer(withdrawn, events('2026-11-27'));
    expect(withdrawn).toMatchObject({ answer: null, lookup: null, mapButtons: [], clears: true });
    const cleared = { ...fresh(), lookup };
    clearDrawn(cleared);
    expect(cleared).toMatchObject({ answer: null, lookup: null, mapButtons: [] });
    expect(cleared.clears).toBeUndefined();
  });

  it('a revision changes only an answer drawn', () => {
    const none = fresh();
    reviseAnswer(none, () => answer('2026-11-28'));
    expect(none.answer).toBeNull();
    const drawn = fresh();
    presentAnswer(drawn, answer('2026-11-27'));
    reviseAnswer(drawn, () => answerOf(events('2026-11-27', [])));
    expect(drawn.answer).toEqual(answerOf(events('2026-11-27', [])));
    expect(drawn.answers).toEqual([answerOf(events('2026-11-27', []))]);
  });
});

// Partitions of two inputs: same kind and day (meal: and meal), another meal, another day, another kind, a study alone
// and one together; the conditions besides (window, Friends, chosen events) never make another request.
describe('Which request an answer answers', () => {
  it.each([
    ['lunch twice, at other times', meal('2026-11-27', 'lunch'), meal('2026-11-27', 'lunch', '12:30'), true],
    ['the events of a day, then some of them', events('2026-11-27'), events('2026-11-27', []), true],
    ['a study place, then with other conditions', study('2026-11-27'), study('2026-11-27'), true],
    ['lunch and dinner', meal('2026-11-27', 'lunch'), meal('2026-11-27', 'dinner'), false],
    ['lunch on two days', meal('2026-11-27', 'lunch'), meal('2026-11-28', 'lunch'), false],
    ['dinner and the events of its day', meal('2026-11-27', 'dinner'), events('2026-11-27'), false],
    ['studying alone and together', study('2026-11-27'), study('2026-11-27', [FRIEND]), false],
  ])('%s', (_case, a, b, same) => {
    expect(requestKey(a) === requestKey(b)).toBe(same);
  });
});

describe('The answers of a message', () => {
  it('keeps one per request: another is added after, the same one replaces it in its place', () => {
    const presented = fresh();
    presentAnswer(presented, answerOf(meal('2026-11-27', 'lunch')));
    presentAnswer(presented, answerOf(meal('2026-11-27', 'dinner')));
    presentAnswer(presented, answerOf(meal('2026-11-27', 'lunch', '12:30')));
    expect(presented.answers?.map(({ input }) => input)).toEqual([
      meal('2026-11-27', 'lunch', '12:30'),
      meal('2026-11-27', 'dinner'),
    ]);
    expect(presented.answer?.input).toEqual(meal('2026-11-27', 'lunch', '12:30'));
  });

  it('keeps them under a Lookup, which only the one slot gives way to', () => {
    const presented = fresh();
    presentAnswer(presented, answerOf(meal('2026-11-27', 'dinner')));
    presentLookup(presented, lookup);
    expect(presented.answer).toBeNull();
    expect(presented.answers).toHaveLength(1);
  });

  it('loses only the request withdrawn, and all of them when cleared', () => {
    const presented = fresh();
    presentAnswer(presented, answerOf(meal('2026-11-27', 'lunch')));
    presentAnswer(presented, answerOf(meal('2026-11-27', 'dinner')));
    withdrawAnswer(presented, meal('2026-11-27', 'dinner'));
    expect(presented.answers?.map(({ input }) => input)).toEqual([meal('2026-11-27', 'lunch')]);
    expect(presented.answer).toBeNull();
    clearDrawn(presented);
    expect(presented.answers).toEqual([]);
  });
});
