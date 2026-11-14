/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { AnswerReply } from '@/api/assistant-types';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE, MEAL_ANSWER_FIXED_START } from '@/api/mock/data/meal-answers';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap, card, FIRST_PLAN_MARKS, mapThings } from './support/answer-map';
import { handle, recalculations, step } from './support/answer-correct';
import { type FakeServer, type Reply, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// A recalculation on its way, a late one, a failed one, and one whose answer has no Plan (P02 ticket 03), over the
// stored answer to "배고파, 민수랑 같이", whose first Plan is "12:15 302동식당" from 12:15 to 12:43.

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

const HELD_MS = 3000;
const NOT_RECALCULATED = '다시 계산하지 못했어요. 잠시 후 다시 시도해 주세요';

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

// Partitions: the reply held back, and a press on each kind of control meanwhile; ✕ before it comes.
describe('a recalculation on its way', () => {
  it('leaves the chips and the handles taking no press, and a second press sends nothing', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_ALONE, afterMs: HELD_MS });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await user.press(card().getByRole('button', { name: '민수 빼기' }));

    expect(card().getByRole('button', { name: '301동에서' })).toBeDisabled();
    expect(card().getByRole('button', { name: '민수 빼기' })).toBeDisabled();
    expect(card().getByRole('button', { name: '다음 후보' })).toBeDisabled();
    expect(handle('from')).toBeDisabled();
    await user.press(card().getByRole('button', { name: '민수 빼기' }));
    await step('from', 'increment');
    await pass(HELD_MS);

    expect(recalculations(server)).toHaveLength(1);
  });

  it('is dropped when the answer is closed before it comes', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_ALONE, afterMs: HELD_MS });
    const everyday: string[] = [];
    const user = await askOnMap(server, MEAL_ANSWER_REPLY, async () => {
      await pass(0);
      everyday.push(...mapThings());
    });
    await user.press(card().getByRole('button', { name: '민수 빼기' }));

    await user.press(screen.getByRole('button', { name: '답 닫기' }));
    await pass(HELD_MS);

    expect(screen.queryByTestId('answer-card')).toBeNull();
    expect(screen.queryByTestId('answer-pill')).toBeNull();
    expect(screen.queryByText('301동식당')).toBeNull();
    expect(mapThings().filter((name) => FIRST_PLAN_MARKS.includes(name))).toEqual([]);
    expect(mapThings()).toEqual(everyday);
  });
});

// Partitions: a refusal of the main server, and no answer at all.
describe('a failed recalculation', () => {
  it.each<[string, Reply]>([
    ['a refusal', refusal(500)],
    ['no answer at all', 'no-answer'],
  ])('after %s says so and leaves the Plan, the chips, and the band as they were', async (_, reply) => {
    server.on('POST /assistant/answers', reply);
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await step('from', 'increment');
    await pass(500);

    expect(within(screen.getByTestId('toast-layer')).getByText(NOT_RECALCULATED)).toBeVisible();
    expect(card().getByText('12:15 302동식당')).toBeVisible();
    expect(card().getByRole('button', { name: '민수 빼기' })).toBeEnabled();
    expect(handle('from')).toHaveAccessibilityValue({ text: '12:15' });
    expect(screen.queryByTestId('time-band-ghost')).toBeNull();
    await user.press(card().getByRole('button', { name: '다음 후보' }));
    expect(card().getByText('2/5')).toBeVisible();
  });
});

// Partitions: an answer to a drag that has no Plan.
describe('an answer without a Plan to a drag', () => {
  it('shows its lines, the chips without "근거", and "되돌리기", and no mark on the map', async () => {
    // The stored fixed-start answer with these two fields changed for the boundary: no Plan, and a reason of the
    // contract's shape with lines of its own.
    const noPlan: AnswerReply = {
      ...MEAL_ANSWER_FIXED_START,
      plans: [],
      noPlan: { reason: 'no-shared-time', lines: [[{ text: '같이 먹을 시간이 없어요', strong: false }]] },
    };
    server.on('POST /assistant/answers', { status: 200, body: noPlan });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await step('from', 'increment');

    expect(card().getByText('같이 먹을 시간이 없어요')).toBeVisible();
    expect(card().getByRole('button', { name: '민수 빼기' })).toBeVisible();
    expect(card().queryByRole('button', { name: '근거' })).toBeNull();
    expect(screen.queryByRole('adjustable', { name: '시작 시각' })).toBeNull();
    expect(mapThings().filter((name) => FIRST_PLAN_MARKS.includes(name))).toEqual([]);
    await user.press(card().getByRole('button', { name: '되돌리기' }));
    expect(card().getByText('12:15 302동식당')).toBeVisible();
  });
});
