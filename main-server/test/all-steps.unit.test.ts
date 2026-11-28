/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  type MealInput,
  NO_CONTEXT,
  type PersonConstraint,
  type ReplyStep,
  type StudyInput,
} from '../src/assistant/dto/answer.dto.js';
import { type ClientCapability, type Presented, type ToolContext } from '../src/assistant/feature.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import { requestKey } from '../src/assistant/presented.js';
import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { readyAt } from '../src/assistant/lookup/study-plan.js';
import { type AllStepsServices, askedStart, presentAllSteps, startAfter } from '../src/assistant/steps/all-steps.js';
import { chainedInput, stepBeforeMeal } from '../src/assistant/steps/plan-steps.js';

// Where a step that can move sets out from, among the steps of a conversation, and the steps on screen sent back (P05
// ticket 74), on a made-up Tuesday.

const DATE = '2087-01-07';
const ASKER = 'asker';
const LUNCH_PLACE = { placeId: 'lunch-place', label: '학생회관', latitude: 37.4598, longitude: 126.9505 };
const KWANJEONG = { placeId: 'kwanjeong', label: '62-1동', latitude: 37.4596, longitude: 126.9497 };

const at = (clock: string): string => `${DATE}T${clock}:00+09:00`;

const dinner = (constraints: PersonConstraint[] = [], from: string | null = null): MealInput => ({
  kind: 'meal',
  date: DATE,
  meal: 'dinner',
  people: [{ userId: ASKER, constraints }],
  window: { from, until: null },
  placeId: null,
});

const study = (from: string | null, constraints: PersonConstraint[] = []): StudyInput => ({
  kind: 'study',
  date: DATE,
  what: 'any',
  people: [{ userId: ASKER, constraints }],
  together: false,
  window: { from, until: null },
  minutes: null,
  chosen: { seatSpaceId: null, roomSpaceId: null },
  area: null,
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

const classAt = (id: string, start: string, end: string): DayItem => ({
  id,
  name: '철학개론',
  start: onDay(DATE, start),
  end: onDay(DATE, end),
  placeId: 'b301',
  isClass: true,
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

const asker = (
  skipped: { date: string; classId: string }[] = [],
  steps?: ReplyStep[],
): Pick<ToolContext, 'userId' | 'context' | 'presented'> => ({
  userId: ASKER,
  context: { ...NO_CONTEXT, skipped, ...(steps === undefined ? {} : { steps }) },
  presented: presented(),
});

const items = (list: DayItem[]): Pick<AllStepsServices, 'itemsOn'> => ({ itemsOn: () => Promise.resolve(list) });

const fromStep = (place: string, time: string): PersonConstraint[] => [
  { kind: 'from', placeId: place, source: 'step' },
  { kind: 'notBefore', time, source: 'step' },
];

describe('The earliest a step that can move may start', () => {
  it("is a meal's window, the time asked from, else its plan's start", () => {
    expect(askedStart(dinner())).toEqual(onDay(DATE, '17:00'));
    expect(askedStart(study('14:00'))).toEqual(onDay(DATE, '14:00'));
    expect(askedStart(study(null), at('15:00'))).toEqual(onDay(DATE, '15:00'));
    expect(askedStart(study(null))).toBeNull();
  });
});

// Partitions: nothing between the steps, a Class between them, that Class left out, the asker's own start, a chain of
// an earlier step, no step before with the steps on screen known and not.
describe('A step set out after the one before it', () => {
  it('sets out from its place when it ends, set by the step', async () => {
    const chained = await startAfter(dinner(), lunchStep, asker(), items([]));
    expect(chained.people[0]?.constraints).toEqual(fromStep(LUNCH_PLACE.placeId, '13:00'));
  });

  it('sets out from no step when a Class lies between them, unless the Class is left out', async () => {
    const between = [classAt('c1', '15:00', '16:30')];
    expect((await startAfter(dinner(), lunchStep, asker(), items(between))).people[0]?.constraints).toEqual([]);
    const left = asker([{ date: DATE, classId: 'c1' }]);
    const chained = await startAfter(dinner(), lunchStep, left, items(between));
    expect(chained.people[0]?.constraints).toEqual(fromStep(LUNCH_PLACE.placeId, '13:00'));
  });

  it('keeps the start the asker named', async () => {
    const own: PersonConstraint[] = [{ kind: 'from', placeId: 'b302', source: 'asker' }];
    expect((await startAfter(dinner(own), lunchStep, asker(), items([]))).people[0]?.constraints).toEqual(own);
  });

  // The seat moved from 11–13 to 12–14 in a follow-up (fault C2): the old chain gives way to the new end.
  it('sets out again from the step before when that step moved', async () => {
    const kept = dinner(fromStep(KWANJEONG.placeId, '13:00'));
    const moved = await startAfter(kept, seatAt('12:00', '14:00'), asker(), items([]));
    expect(moved.people[0]?.constraints).toEqual(fromStep(KWANJEONG.placeId, '14:00'));
  });

  it('drops a chain whose step is gone only when the steps on screen are known', async () => {
    const kept = dinner(fromStep(KWANJEONG.placeId, '13:00'));
    expect(await startAfter(kept, null, asker(), items([]))).toBe(kept);
    expect((await startAfter(kept, null, asker([], [lunchStep]), items([]))).people[0]?.constraints).toEqual([]);
  });

  it('is told to an app before answers as the asker, as always', () => {
    expect(chainedInput(dinner(), lunchStep)?.people[0]?.constraints.map(({ source }) => source)).toEqual([
      'asker',
      'asker',
    ]);
  });
});

// Fault A2, by time alone: a seat that starts inside the meal's window before an hour-long meal could come first.
describe('The step a meal follows while the model plans it', () => {
  it('is one that starts before an hour-long meal could come first in its window', () => {
    expect(stepBeforeMeal([seatAt('17:30', '19:00')], dinner())?.title).toBe('7층 7A 열람실 2 구역');
    expect(stepBeforeMeal([seatAt('19:00', '21:00')], dinner())).toBeNull();
    expect(stepBeforeMeal([seatAt('21:30', '22:30')], dinner())).toBeNull();
  });
});

describe('When a study plan is ready to set out', () => {
  it('is the later of the time asked from and the step before its end', () => {
    const now = onDay(DATE, '09:00');
    const after = (from: string | null): Date => readyAt(study(from, fromStep(KWANJEONG.placeId, '13:00')), now);
    expect(after(null)).toEqual(onDay(DATE, '13:00'));
    expect(after('12:00')).toEqual(onDay(DATE, '13:00'));
    expect(after('14:00')).toEqual(onDay(DATE, '14:00'));
  });
});

// The steps on screen sent back with a message that changes none of them, such as a question about the seat.
describe('The steps on screen, sent back', () => {
  // A leave-by the User added after the chain.
  const kept = dinner([...fromStep(KWANJEONG.placeId, '13:00'), { kind: 'leaveBy', time: '19:00', source: 'asker' }]);
  const steps = [
    seatAt('11:00', '13:00', { shows: { kind: 'card', key: 'book:7F-7A-zone2:2087-01-07:1100:120' } }),
    stepOf({
      title: '학생회관식당에서 저녁',
      startAt: at('17:00'),
      endAt: at('18:00'),
      shows: { kind: 'answer', key: requestKey(kept) },
    }),
  ];

  it('come back whole, and a step whose start did not change is not planned again', async () => {
    const replan = vi.fn<AllStepsServices['replan']>();
    const context: ToolContext = {
      userId: ASKER,
      now: onDay(DATE, '09:00'),
      context: { ...NO_CONTEXT, conditions: kept, answers: [kept], steps },
      capabilities: new Set<ClientCapability>(['answer', 'answers']),
      found: new FoundIds(),
      shown: null,
      presented: presented(),
      judged: new Map(),
      restaurants: new Map(),
    };

    await presentAllSteps(context, { kwanjeong: () => null, replan, itemsOn: () => Promise.resolve([]) });

    expect(replan).not.toHaveBeenCalled();
    expect(context.presented.steps).toEqual(steps);
    expect(context.presented.answers).toBeUndefined();
  });
});
