/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type MealInput, type Plan, type ReplyStep } from '../src/assistant/dto/answer.dto.js';
import { type NotDone, type Presented } from '../src/assistant/feature.js';
import { type LibraryCard } from '../src/assistant/library/library-card.js';
import { bookingSteps, planChanged, stepOrder, stepsSentence } from '../src/assistant/steps/plan-steps.js';

// The steps of one message every app gets (P05 ticket 74): one request is one step, a step without a plan comes after
// those with one, and when the server planned again a plan the model had worded, the steps say it. On a made-up
// Tuesday.

const DATE = '2087-01-07';
const LUNCH_PLACE = { placeId: 'lunch-place', label: '학생회관', latitude: 37.4598, longitude: 126.9505 };
const KWANJEONG = { placeId: 'kwanjeong', label: '62-1동', latitude: 37.4596, longitude: 126.9497 };

const at = (clock: string): string => `${DATE}T${clock}:00+09:00`;

const dinner = (): MealInput => ({
  kind: 'meal',
  date: DATE,
  meal: 'dinner',
  people: [{ userId: 'asker', constraints: [] }],
  window: { from: null, until: null },
  placeId: null,
});

const stepOf = (more: Partial<ReplyStep>): ReplyStep => ({
  kind: 'meal',
  title: '학생회관식당에서 점심',
  place: LUNCH_PLACE,
  from: null,
  startAt: at('12:00'),
  endAt: at('13:00'),
  status: 'shown',
  reason: null,
  shows: { kind: 'answer', key: 'lunch' },
  ...more,
});

const lunchStep = stepOf({});

const seatAt = (start: string, end: string, more: Partial<ReplyStep> = {}): ReplyStep =>
  stepOf({
    kind: 'seat',
    title: '7층 7A 열람실 2 구역',
    place: KWANJEONG,
    startAt: at(start),
    endAt: at(end),
    shows: null,
    ...more,
  });

const presented = (more: Partial<Presented> = {}): Presented => ({
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: null,
  lookup: null,
  refusal: null,
  ...more,
});

const notDone = (step: ReplyStep): NotDone => ({ step, closed: false });

// A 5층 seat booked in the place of a 7층 one refused.
const fifthFloor: LibraryCard = {
  kind: 'library',
  library: {
    key: 'book:5F-5A:2087-01-07:1100:120',
    action: 'book',
    space: {
      id: '5F-5A',
      name: '5A 열람실',
      floor: 5,
      kind: 'reading-room',
      placeNumber: '62-1',
      unit: 'seat',
      roomNo: 1,
      sectorNo: 1,
      seatNos: [],
      mapImage: null,
      hours: { open: '07:00', close: '23:00' },
      minMinutes: 60,
      maxMinutes: 240,
      stepMinutes: 30,
    },
    date: DATE,
    start: '11:00',
    minutes: 120,
    seat: null,
    useDesc: null,
    useDescOptions: null,
    pledge: null,
    companions: [],
    questId: null,
    notes: [],
    until: null,
    target: null,
  },
};

// Fault G6: one request is one step.
describe('The steps of the bookings', () => {
  const refused7 = seatAt('11:00', '19:00', { status: 'not-done', reason: '최대 4시간', place: null });

  it('leave out a refusal of the same unit that day once another seat is booked in its place', () => {
    const steps = bookingSteps(presented({ cards: [fifthFloor], notDone: [notDone(refused7)] }), KWANJEONG);
    expect(steps.map(({ title, status }) => ({ title, status }))).toEqual([
      { title: '5층 5A 열람실', status: 'shown' },
    ]);
  });

  it('keep one of two refusals of the same space, the last', () => {
    const later = { ...refused7, reason: '당일만' };
    const steps = bookingSteps(presented({ notDone: [notDone(refused7), notDone(later)] }), KWANJEONG);
    expect(steps.map(({ reason }) => reason)).toEqual(['당일만']);
  });
});

// Fault A4: a dinner too late for today is not ① before a seat after it.
describe('The order of the steps', () => {
  it('puts an answer without a plan after the steps that have one, in the order they came', () => {
    const late = stepOf({ title: '저녁', place: null, startAt: at('17:00'), endAt: null, status: 'not-done' });
    const seat = seatAt('22:00', '23:00');
    expect(stepOrder([late, seat]).map(({ title }) => title)).toEqual(['7층 7A 열람실 2 구역', '저녁']);
  });
});

const planAt = (id: string, startAt: string): Plan => ({
  id,
  title: `${id}에서 저녁`,
  place: LUNCH_PLACE,
  startAt,
  endAt: startAt,
  togetherMinutes: 60,
  meeting: null,
  parts: [],
  subQuests: [],
  lines: [],
  basis: [],
  scene: { people: [], places: [], routes: [], flags: [] },
  band: { range: { startAt, endAt: startAt }, now: startAt, lanes: [], startAt, endAt: startAt, text: '' },
});

const answerAt = (id: string, startAt: string): AnswerReply => ({
  input: dinner(),
  chips: [],
  plans: [planAt(id, startAt)],
  dropped: [],
  noPlan: null,
});

// Fault G5: the plan set out from the step before stands, and the steps say it.
describe('A plan the model worded, planned again', () => {
  it('is another when its first plan or its time changed, or it has none', () => {
    expect(planChanged(answerAt('학생회관식당', at('12:00')), answerAt('학생회관식당', at('12:00')))).toBe(false);
    expect(planChanged(answerAt('학생회관식당', at('12:00')), answerAt('301동식당', at('12:00')))).toBe(true);
    expect(planChanged(answerAt('학생회관식당', at('12:00')), answerAt('학생회관식당', at('13:10')))).toBe(true);
    expect(planChanged(answerAt('학생회관식당', at('12:00')), { ...answerAt('x', at('12:00')), plans: [] })).toBe(true);
  });

  it('is said by the steps, one short sentence each', () => {
    const late = stepOf({ title: '저녁', place: null, status: 'not-done', reason: '그 시간에는 비는 시간이 없어요' });
    expect(stepsSentence([seatAt('11:00', '13:00'), lunchStep, late])).toBe(
      '11:00 7층 7A 열람실 2 구역. 12:00 학생회관식당에서 점심. 저녁: 그 시간에는 비는 시간이 없어요.',
    );
  });
});
