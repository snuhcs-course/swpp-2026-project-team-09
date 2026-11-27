/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { contextLines } from '../src/assistant/context-lines.js';
import { type AnswerReply, type MealInput, NO_CONTEXT, type Plan } from '../src/assistant/dto/answer.dto.js';
import { type FeatureReply } from '../src/assistant/feature.js';
import { replyBody } from '../src/assistant/reply-body.js';

// The reply of a message that drew several answers (P05 ticket 73): an app that says `answers` gets them all and which
// of them holds a plan chosen, any other app the reply it always got; and the model reads the other steps on screen.

const ME = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

const meal = (which: MealInput['meal']): MealInput => ({
  kind: 'meal',
  date: '2026-11-27',
  meal: which,
  people: [{ userId: ME, constraints: [] }],
  window: { from: null, until: null },
  placeId: null,
});

const planAt = (id: string): Plan => ({
  id,
  title: `${id}에서 식사`,
  place: { placeId: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', label: id, latitude: 0, longitude: 0 },
  startAt: '2026-11-27T12:00:00+09:00',
  endAt: '2026-11-27T13:00:00+09:00',
  togetherMinutes: 60,
  meeting: null,
  parts: [],
  subQuests: [],
  lines: [],
  basis: [],
  scene: { people: [], places: [], routes: [], flags: [] },
  band: {
    range: { startAt: '2026-11-27T11:30:00+09:00', endAt: '2026-11-27T13:30:00+09:00' },
    now: '2026-11-27T09:00:00+09:00',
    lanes: [],
    startAt: '2026-11-27T12:00:00+09:00',
    endAt: '2026-11-27T13:00:00+09:00',
    text: '12:00–13:00 · 식사 60분',
  },
});

const answerOf = (input: MealInput, planIds: string[]): AnswerReply => ({
  input,
  chips: [],
  plans: planIds.map((id) => planAt(id)),
  dropped: [],
  noPlan: null,
});

const LUNCH = answerOf(meal('lunch'), ['학생회관식당']);
const DINNER = answerOf(meal('dinner'), ['301동식당', '학생회관식당']);

const reply = (more: Partial<FeatureReply>): FeatureReply => ({
  text: '점심과 저녁을 짰어요.',
  noTextFinishReason: null,
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: DINNER,
  answers: [LUNCH, DINNER],
  lookup: null,
  refusal: null,
  ...more,
});

describe('The reply of lunch and dinner', () => {
  it('gives an app that says answers both, and the last one in answer', () => {
    expect(replyBody(reply({}), undefined, ['answer', 'answers'])).toMatchObject({
      answer: DINNER,
      answers: [LUNCH, DINNER],
    });
  });

  it('gives any other app the last one alone, as before', () => {
    const body = replyBody(reply({}), undefined, ['answer']);
    expect(body.answer).toBe(DINNER);
    expect(body).not.toHaveProperty('answers');
  });

  it('gives an app that says answers an empty list when nothing was drawn', () => {
    expect(replyBody(reply({ answer: null, answers: undefined }), undefined, ['answers']).answers).toEqual([]);
  });

  it('names which answer holds the plan chosen, the last one that does', () => {
    const body = replyBody(reply({ select: '학생회관식당' }), undefined, ['answer', 'answers']);
    expect(body.select).toEqual({ planId: '학생회관식당', index: 1 });
    expect(replyBody(reply({ select: '학생회관식당' }), undefined, ['answer']).select).toEqual({
      planId: '학생회관식당',
    });
  });

  it('keeps the answers drawn when the last request was withdrawn, and does not clear them', () => {
    const withdrawn = reply({ answer: null, answers: [LUNCH], clears: true });
    expect(replyBody(withdrawn, undefined, ['answer', 'answers'])).not.toHaveProperty('clears');
    expect(replyBody(withdrawn, undefined, ['answer'])).toMatchObject({ answer: null, clears: true });
  });
});

describe('The lines of the steps on screen', () => {
  it('give the step open as the plan on screen and each other one as another step', () => {
    const lines = contextLines({ ...NO_CONTEXT, conditions: meal('dinner'), answers: [meal('lunch'), meal('dinner')] });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^\[Plan on screen: \{"plan":null,"date":"2026-11-27","meal":"dinner"/u);
    expect(lines[1]).toMatch(/^\[Another step on screen: \{"plan":null,"date":"2026-11-27","meal":"lunch"/u);
  });

  it('are as before when the app sends no other steps', () => {
    expect(contextLines({ ...NO_CONTEXT, conditions: meal('dinner') })).toHaveLength(1);
  });
});
