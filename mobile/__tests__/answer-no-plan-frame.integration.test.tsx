/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, AssistantReply, MealInput, PlanInput } from '@/api/assistant-types';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { ONE_PM, ONE_SKIPPED_REPLY } from '@/api/mock/data/skipped-classes';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap, card, timeBar as bar } from './support/answer-map';
import { recalculations } from './support/answer-correct';
import { dragBody, layTrack } from './support/band-move';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { checkedRows, pickDone, pickRow } from './support/picking';
import { answerMainScreen, askMainServer, MIN_JUN, PHONE_NOW } from './support/server';

// An answer with no Plan keeps the frame it was asked in (P01 ticket 31; the user's phone, 2026-11-27): the time card
// with its handles, "같이 N ›" with the people asked for, who can be unchecked, the Classes left out with their ✕, and
// the meal's conditions with theirs, so that nothing set by hand is lost to a recalculation that finds no Plan. Against
// the fake main server, over the stored answer to "배고파, 민수랑 같이" with the 13:00 Class left out, whose band carries
// 김민준 among the Friends to add, in a Class until 15:00, as a main server since P04 ticket 64 sends.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('./support/fake-socket'));

const [ASKER, MIN_SU] = MEAL_ANSWER.input.people;
const ADD = '같이 먹을 친구 추가';
const NO_SHARED = '점심 시간에는 같이 비는 시간이 없어요';
const PUT_BACK_ONE = '13:00 24동 수업 다시 넣기';
const at = (clock: string): string => `2026-11-17T${clock}:00+09:00`;

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// The stored reply with 김민준 among each band's Friends to add, in a Class from 10:30 to 15:00.
function withMinJunToAdd(reply: AssistantReply & { answer: AnswerReply }): AssistantReply & { answer: AnswerReply } {
  const others = [
    {
      userId: MIN_JUN.id,
      name: MIN_JUN.name,
      busy: [{ startAt: at('10:30'), endAt: at('15:00'), label: '수업' }],
      walkMinutes: 16,
    },
  ];
  const plans = reply.answer.plans.map((plan) => ({ ...plan, band: { ...plan.band, others } }));
  return { ...reply, answer: { ...reply.answer, plans } };
}

function isMealInput(value: unknown): value is MealInput {
  return typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'meal';
}

// The meal asked in a request's body.
function inputOf(body: unknown): MealInput {
  const input = typeof body === 'object' && body !== null && 'input' in body ? body.input : null;
  if (!isMealInput(input)) {
    throw new Error('No meal was asked');
  }
  return input;
}

// The main server's answer with no Plan to `input`, which it sends back as it is.
function noPlanTo(input: PlanInput, more: Partial<AnswerReply> = {}): AnswerReply {
  return {
    ...MEAL_ANSWER,
    input,
    plans: [],
    dropped: [],
    noPlan: { reason: 'no-shared-time', lines: [[{ text: NO_SHARED, strong: false }]] },
    ...more,
  };
}

function answerNoPlan(): void {
  server.on('POST /assistant/answers', ({ body }) => ({ status: 200, body: noPlanTo(inputOf(body)) }));
}

function lastInput(): MealInput {
  return inputOf(recalculations(server).at(-1));
}

// Partitions, by how the answer with no Plan was reached: "+ 같이", a Class put back, the band moved, a condition kept,
// and a first answer. Expected values: the rule of ticket 31.
describe('An answer with no Plan after "+ 같이"', () => {
  it('keeps the time card with the Friends asked for, the Class left out, and why', async () => {
    const user = await askOnMap(server, withMinJunToAdd(ONE_SKIPPED_REPLY));
    answerNoPlan();

    await user.press(bar().getByRole('button', { name: ADD }));
    await user.press(pickRow(MIN_JUN.name));
    await user.press(pickDone());
    await pass(500);

    expect(bar().getByRole('button', { name: ADD })).toHaveTextContent('같이 2 ›');
    expect(bar().getByText('13:00 ✕')).toBeOnTheScreen();
    expect(card().getByText(NO_SHARED)).toBeVisible();
  });

  it('lets the Friend be unchecked, and asks again without them, the Class still left out', async () => {
    const user = await askOnMap(server, withMinJunToAdd(ONE_SKIPPED_REPLY));
    answerNoPlan();
    await user.press(bar().getByRole('button', { name: ADD }));
    await user.press(pickRow(MIN_JUN.name));
    await user.press(pickDone());
    await pass(500);

    await user.press(bar().getByRole('button', { name: ADD }));
    expect(checkedRows()).toContainEqual(expect.stringMatching(new RegExp(`^${MIN_JUN.name} · `, 'u')));
    await user.press(pickRow(MIN_JUN.name));
    await user.press(pickDone());
    await pass(500);

    expect(lastInput().people).toEqual([ASKER, MIN_SU]);
    expect(lastInput().skipped).toEqual([ONE_PM.id]);
  });
});

describe('An answer with no Plan after a Class put back', () => {
  it('keeps the time card, without that Class left out', async () => {
    const user = await askOnMap(server, ONE_SKIPPED_REPLY);
    answerNoPlan();

    await user.press(bar().getByRole('button', { name: PUT_BACK_ONE }));
    await pass(500);

    expect(bar().getByRole('button', { name: ADD })).toHaveTextContent('같이 1 ›');
    expect(bar().queryByText('13:00 ✕')).toBeNull();
    expect(card().getByText(NO_SHARED)).toBeVisible();
  });
});

describe('An answer with no Plan after the band moved', () => {
  it('keeps the time card with its handles, which move it again', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await layTrack(300);
    answerNoPlan();

    await dragBody(40);

    expect(screen.getByRole('adjustable', { name: '시작 시각' })).toBeOnTheScreen();
    expect(screen.getByRole('adjustable', { name: '끝 시각' })).toBeOnTheScreen();
    await dragBody(40);
    expect(recalculations(server)).toHaveLength(2);
    expect(user).toBeDefined();
  });
});

describe('An answer with no Plan to a meal with a price set', () => {
  it('keeps the price with its ✕, which asks again without it', async () => {
    const priced = { ...MEAL_ANSWER.input, maxPrice: 6000 };
    const reply = { ...MEAL_ANSWER_REPLY, answer: { ...MEAL_ANSWER, input: priced } };
    const user = await askOnMap(server, reply);
    await layTrack(300);
    answerNoPlan();
    await dragBody(40);

    const price = card().getByRole('button', { name: /이하/u });
    await user.press(price);
    await pass(500);

    expect(lastInput().maxPrice).toBeUndefined();
  });
});

describe('A first answer with no Plan', () => {
  it('draws the time card of the band the main server sends with it', async () => {
    const band = MEAL_ANSWER.plans[0]?.band;
    if (band === undefined) {
      throw new Error('The stored answer has no band');
    }
    const noPlan = { reason: 'no-shared-time' as const, lines: [[{ text: NO_SHARED, strong: false }]], band };
    const answer = noPlanTo(MEAL_ANSWER.input, { noPlan });
    await askOnMap(server, { ...MEAL_ANSWER_REPLY, text: NO_SHARED, answer });

    expect(bar().getByRole('button', { name: ADD })).toHaveTextContent('같이 1 ›');
    expect(card().getByText(NO_SHARED)).toBeVisible();
  });
});
