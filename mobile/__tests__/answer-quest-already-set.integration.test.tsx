/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { AssistantReply, MealSet } from '@/api/assistant-types';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { askOnMap } from './support/answer-map';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 17: an answer beside a Quest the User already holds. The main server sets the held lunch aside, plans as
// if it were not there, and names it (`mealSet`); its line stands in the dock with 그대로 두기, and the button beside
// the input changes it (바꾸기), or, for one shared with others, opens its 파티 (파티 보기). Over the stored answer to
// "배고파" for the User alone, with the main server's line of P05 ticket 16. Expected values: that line and the
// buttons as the ticket and its review agreed them.

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

const LINE = '이미 12:16 302동식당 점심이 있어요. 바꿀까요?';
const OWN: MealSet = {
  questId: 'q-lunch',
  title: '302동식당에서 점심',
  startAt: '2026-10-01T12:16:00+09:00',
  place: '302동식당',
  friendNames: [],
  shared: false,
};
const SHARED: MealSet = { ...OWN, questId: 'q-shared', friendNames: ['민수'], shared: true };
const SHARED_LINE = '이미 민수와 12:16 302동식당 점심이 있어요. 바꾸려면 그 파티에서 바꿔 주세요.';

function replyWith(mealSet: MealSet, text = LINE): AssistantReply {
  return { ...MEAL_ANSWER_REPLY, text, answer: { ...MEAL_ANSWER_ALONE, mealSet } };
}

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

function beside(): ReturnType<typeof within> {
  return within(screen.getByTestId('ai-input-beside'));
}

function dock(): ReturnType<typeof within> {
  return within(screen.getByTestId('dock-row'));
}

// Partitions: the line and its buttons; 바꾸기 pressed, answered and refused; 그대로 두기 pressed.
describe('an answer beside a lunch the User holds alone', () => {
  it('says so in the dock with 그대로 두기, and 바꾸기 stands beside the input', async () => {
    await askOnMap(server, replyWith(OWN));

    expect(dock().getByText(LINE)).toBeVisible();
    expect(dock().getByRole('button', { name: '그대로 두기' })).toBeVisible();
    expect(beside().getByRole('button', { name: '바꾸기' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '일정에 넣기' })).toBeNull();
  });

  it('makes the new Plan from 바꾸기, which the main server puts in place of the held one', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST });
    const user = await askOnMap(server, replyWith(OWN));

    await user.press(beside().getByRole('button', { name: '바꾸기' }));
    await pass(500);

    expect(server.received('POST /plans')).toHaveLength(1);
  });

  it('says to change it in its 파티 when the lunch became shared, and makes nothing', async () => {
    server.on('POST /plans', refusal(409, 'MEAL_ALREADY_SET', { questId: OWN.questId }));
    const user = await askOnMap(server, replyWith(OWN));

    await user.press(beside().getByRole('button', { name: '바꾸기' }));
    await pass(500);

    expect(screen.getByText('같이 정한 약속이라 그 파티에서 바꿔 주세요')).toBeVisible();
    expect(server.received('POST /plans')).toHaveLength(1);
  });

  it('closes the answer from 그대로 두기 and sends nothing', async () => {
    const user = await askOnMap(server, replyWith(OWN));

    await user.press(dock().getByRole('button', { name: '그대로 두기' }));
    await pass(300);

    expect(screen.queryByTestId('answer-card')).toBeNull();
    expect(server.received('POST /plans')).toHaveLength(0);
  });
});

// Partitions: the buttons; 파티 보기 pressed.
describe('an answer beside a lunch shared with a Friend', () => {
  it('has no 바꾸기, and 파티 보기 beside the input', async () => {
    await askOnMap(server, replyWith(SHARED, SHARED_LINE));

    expect(dock().getByText(SHARED_LINE)).toBeVisible();
    expect(dock().getByRole('button', { name: '그대로 두기' })).toBeVisible();
    expect(beside().getByRole('button', { name: '파티 보기' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '바꾸기' })).toBeNull();
  });

  it('opens that 파티 from 파티 보기', async () => {
    const user = await askOnMap(server, replyWith(SHARED, SHARED_LINE));

    await user.press(beside().getByRole('button', { name: '파티 보기' }));
    await pass(300);

    expect(shownAddress()).toBe(`/room/${SHARED.questId}`);
  });
});
