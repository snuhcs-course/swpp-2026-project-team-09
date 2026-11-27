/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  type AnswerReply,
  type EventsInput,
  type MealInput,
  NO_CONTEXT,
  type PersonConstraint,
  type QuestsInput,
  type ReplyStep,
  type RequestContext,
  type StudyInput,
} from '../src/assistant/dto/answer.dto.js';
import { type ClientCapability, type Presented, type ToolContext } from '../src/assistant/feature.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import { presentAnswer, requestKey, reviseAnswer } from '../src/assistant/presented.js';
import { replyBody } from '../src/assistant/reply-body.js';
import { type AllStepsServices, presentAllSteps } from '../src/assistant/steps/all-steps.js';
import { onScreen } from '../src/assistant/steps/steps-on-screen.js';

// Follow-ups on the steps on screen, for an app that says `answers` (P05 ticket 74): the key an answer keeps through a
// recalculation, a request withdrawn beside one kept, what holds the User busy, a step that could not be planned again,
// and the steps sent back twice or without a key. On a made-up Tuesday.

const DATE = '2087-01-07';
const ASKER = 'asker';
const FRIEND = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
const KWANJEONG = { placeId: 'kwanjeong', label: '62-1동', latitude: 37.4596, longitude: 126.9497 };
const HALL = { placeId: 'hall', label: '문화관', latitude: 37.4601, longitude: 126.9512 };

const at = (clock: string): string => `${DATE}T${clock}:00+09:00`;

const study = (people: string[], constraints: PersonConstraint[] = []): StudyInput => ({
  kind: 'study',
  date: DATE,
  what: 'any',
  people: people.map((userId, index) => ({ userId, constraints: index === 0 ? constraints : [] })),
  together: false,
  window: { from: null, until: null },
  minutes: null,
  chosen: { seatSpaceId: null, roomSpaceId: null },
  area: null,
});

const meal = (which: MealInput['meal'], constraints: PersonConstraint[] = []): MealInput => ({
  kind: 'meal',
  date: DATE,
  meal: which,
  people: [{ userId: ASKER, constraints }],
  window: { from: null, until: null },
  placeId: null,
});

const events: EventsInput = { kind: 'events', date: DATE, eventIds: null };
const quests: QuestsInput = { kind: 'quests', globalEventId: null, questIds: [FRIEND] };

const stepOf = (more: Partial<ReplyStep>): ReplyStep => ({
  kind: 'seat',
  title: '7층 7A 열람실 2 구역',
  place: KWANJEONG,
  from: null,
  startAt: at('11:00'),
  endAt: at('13:00'),
  status: 'shown',
  reason: null,
  shows: { kind: 'card', key: 'book:7F-7A-zone2:2087-01-07:1100:120' },
  ...more,
});

const answerStepAt = (key: string, start: string, end: string, more: Partial<ReplyStep> = {}): ReplyStep =>
  stepOf({
    kind: 'events',
    title: key,
    place: HALL,
    startAt: at(start),
    endAt: at(end),
    shows: { kind: 'answer', key },
    ...more,
  });

const answerOf = (input: AnswerReply['input']): AnswerReply => ({
  input,
  chips: [],
  plans: [],
  dropped: [],
  noPlan: null,
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

const contextWith = (asked: Partial<RequestContext>, more: Partial<Presented> = {}): ToolContext => ({
  userId: ASKER,
  now: new Date(at('09:00')),
  context: { ...NO_CONTEXT, ...asked },
  capabilities: new Set<ClientCapability>(['answer', 'answers']),
  found: new FoundIds(),
  shown: null,
  presented: presented(more),
  judged: new Map(),
  restaurants: new Map(),
});

const services = (replan: AllStepsServices['replan']): AllStepsServices => ({
  kwanjeong: () => null,
  replan,
  itemsOn: () => Promise.resolve([]),
});

// Fault 2 of the read of #703: a Friend added through POST /assistant/answers made the study place on screen one
// together, whose own key is another; the app kept the key it was given.
describe('An answer recalculated into another request', () => {
  const alone = study([ASKER]);
  const firstKey = requestKey(alone);
  const together = study(
    [ASKER, FRIEND],
    [
      { kind: 'from', placeId: KWANJEONG.placeId, source: 'step' },
      { kind: 'notBefore', time: '13:00', source: 'step' },
    ],
  );
  const studyStep = stepOf({
    kind: 'study',
    title: '관정관',
    startAt: at('13:10'),
    endAt: at('16:00'),
    shows: { kind: 'answer', key: firstKey },
  });
  const seat = stepOf({ endAt: at('12:00') });

  it('keeps the key it had on screen, and is planned again after the step before it moved', async () => {
    const replan = vi.fn<AllStepsServices['replan']>((input) => Promise.resolve(answerOf(input)));
    // The seat now ends at 12:00, an hour earlier than the study place's chain says.
    const context = contextWith({ conditions: together, answers: [together], steps: [seat, studyStep] });

    await presentAllSteps(context, services(replan));

    expect(replan).toHaveBeenCalledTimes(1);
    expect(context.presented.answers?.map(({ key }) => key)).toEqual([firstKey]);
    expect(context.presented.steps?.map(({ shows }) => shows)).toEqual([seat.shows, { kind: 'answer', key: firstKey }]);
  });

  it('is the one the message plans again: no second study place beside it', async () => {
    const context = contextWith({ conditions: together, answers: [together], steps: [stepOf({}), studyStep] });
    presentAnswer(context.presented, answerOf(together));

    await presentAllSteps(
      context,
      services(() => Promise.reject(new Error('not planned again'))),
    );

    expect(context.presented.answers?.map(({ key }) => key)).toEqual([firstKey]);
    expect(context.presented.steps).toHaveLength(2);
  });
});

// Fault 1 of the read of #703: dinner asked again found nothing, beside lunch kept from an earlier reply.
describe('A request withdrawn beside an answer kept on screen', () => {
  it('names its key on screen and takes nothing else off: an app that says answers never gets clears', async () => {
    const lunch = meal('lunch');
    const dinner = meal('dinner');
    const steps = [
      answerStepAt(requestKey(lunch), '12:00', '13:00', { kind: 'meal' }),
      answerStepAt('dinner-on-screen', '18:00', '19:00', { kind: 'meal' }),
    ];
    const context = contextWith({ conditions: dinner, answers: [lunch, dinner], steps });
    context.presented.withdrawn = [requestKey(dinner)];
    context.presented.clears = true;

    await presentAllSteps(
      context,
      services(() => Promise.reject(new Error('none'))),
    );
    const body = replyBody(
      { ...context.presented, text: '오늘 저녁은 끝났어요.', noTextFinishReason: null },
      undefined,
      ['answer', 'answers'],
    );

    expect(body.withdrawn).toEqual(['dinner-on-screen']);
    expect(body).not.toHaveProperty('clears');
    expect(body).not.toHaveProperty('steps');
  });
});

// Fault 5 of the read of #710: what keeps the User busy before a step at a fixed time.
describe('A step at a fixed time', () => {
  it('is reached after a refused seat, which holds no time', async () => {
    const refused = stepOf({ status: 'not-done', reason: '최대 4시간', shows: null });
    const event = answerStepAt(requestKey(events), '12:00', '13:30');
    const context = contextWith({ answers: [events], steps: [refused, event] });

    await presentAllSteps(
      context,
      services(() => Promise.reject(new Error('fixed'))),
    );

    expect(context.presented.steps?.map(({ status }) => status)).toEqual(['not-done', 'shown']);
  });

  it('out of reach does not keep a later one from being reached', async () => {
    const dinner = answerStepAt(requestKey(meal('dinner')), '17:30', '18:30', { kind: 'meal' });
    const late = answerStepAt(requestKey(events), '18:00', '20:00');
    const party = answerStepAt(requestKey(quests), '18:45', '19:45', { kind: 'quests' });
    const context = contextWith({ answers: [meal('dinner'), events, quests], steps: [dinner, late, party] });

    await presentAllSteps(
      context,
      services(() => Promise.reject(new Error('fixed'))),
    );

    expect(context.presented.steps?.map(({ status }) => status)).toEqual(['shown', 'not-done', 'shown']);
  });
});

// Should 6 of the read of #710: a step that could not be planned again does not stay as if it still fit.
describe('A step whose step before changed but could not be planned again', () => {
  it('stays as it was, not done, with why', async () => {
    const lunch = meal('lunch', [
      { kind: 'from', placeId: KWANJEONG.placeId, source: 'step' },
      { kind: 'notBefore', time: '13:00', source: 'step' },
    ]);
    const lunchStep = answerStepAt(requestKey(lunch), '13:05', '14:00', { kind: 'meal' });
    const event = answerStepAt(requestKey(events), '15:00', '16:00');
    const context = contextWith({ answers: [lunch, events], steps: [lunchStep, event] });

    await presentAllSteps(
      context,
      services(() => Promise.reject(new Error('no plan service'))),
    );

    expect(context.presented.steps?.[0]).toMatchObject({
      status: 'not-done',
      reason: '앞 일정이 바뀌었는데 다시 짜지 못했어요',
    });
  });
});

describe('The steps sent back', () => {
  it('count a step sent twice once, and leave out an answer step without its key', () => {
    const event = answerStepAt(requestKey(events), '15:00', '16:00');
    const keyless = stepOf({ kind: 'meal', shows: { kind: 'answer' } });
    expect(onScreen({ steps: [stepOf({}), stepOf({}), event, event, keyless], answers: [events] }).steps).toEqual([
      stepOf({}),
      event,
    ]);
  });
});

// Should 3 of the read of #703: a change that makes the answer another request replaces it, never adds a second.
describe('An answer the server changed', () => {
  it('stays in its place when the change makes it another request', () => {
    const drawn = presented();
    presentAnswer(drawn, answerOf(meal('lunch')));
    reviseAnswer(drawn, () => answerOf(meal('dinner')));
    expect(drawn.answers?.map(({ input }) => input)).toEqual([meal('dinner')]);
  });
});
