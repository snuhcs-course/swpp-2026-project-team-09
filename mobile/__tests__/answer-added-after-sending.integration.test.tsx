/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { AnswerReply, AssistantReply, KeptQuest } from '@/api/assistant-types';
import { MEAL_ANSWER_MENUS, MEAL_ANSWER_MENUS_REPLY } from '@/api/mock/data/meal-answer-menus';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { askOnMap } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P05 ticket 85: a Friend added to a meal or a meeting already sent ends in a way forward. When no plan has the Friend
// in it, the main server shows the meal as it is held with why they cannot join it as its note, and the press still
// invites them beside 그대로 두기; when there is no plan at all beside a Quest the User holds, its reasons stand beside
// 파티 보기, where its people are changed, never alone.

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

const LATE = '지은은 12:33에야 도착해요';
const LUNCH: KeptQuest = {
  kind: 'meal-lunch',
  questId: 'q-lunch',
  title: '302동식당에서 점심',
  startAt: '2026-11-17T12:16:00+09:00',
  endAt: null,
  place: '302동식당',
  point: null,
  people: [{ name: '민수', answer: 'waiting' }],
  mine: true,
  changeable: true,
};
const MEETING: KeptQuest = {
  kind: 'meet',
  questId: 'q-meeting',
  title: '민수와 만나기',
  startAt: '2026-10-01T15:00:00+09:00',
  endAt: null,
  place: '302동 앞',
  point: null,
  people: [{ name: '민수', answer: 'accepted' }],
  mine: true,
  changeable: true,
};
const NO_TIME: AnswerReply['noPlan'] = {
  reason: 'no-shared-time',
  lines: [[{ text: LATE, strong: false }], [{ text: '12:30 수업에 가려면 12:11엔 나서야 해요', strong: false }]],
};

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

function dock(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

function beside(): ReturnType<typeof within> {
  return within(screen.getByTestId('ai-input-beside'));
}

function replyOf(answer: AnswerReply): AssistantReply {
  return { ...MEAL_ANSWER_MENUS_REPLY, text: '', answer };
}

const ADDING = { friends: [{ userId: 'u-jieun', name: '지은' }], startAt: LUNCH.startAt, movesTo: null };

// Partitions: the meal shown as it is held with its note; a meal and a meeting with no plan beside a Quest held.
describe('a Friend added to the lunch sent, who cannot come in it', () => {
  it('says why beside the press that invites them and 그대로 두기', async () => {
    await askOnMap(server, replyOf({ ...MEAL_ANSWER_MENUS, planSet: LUNCH, adding: ADDING, note: LATE }));

    expect(dock().getByText(LATE)).toBeVisible();
    expect(beside().getByRole('button', { name: '지은이 초대 보내기' })).toBeEnabled();
    expect(beside().getByRole('button', { name: '그대로 두기' })).toBeEnabled();
  });

  it('invites them to the lunch held from the press', async () => {
    server.on(`PUT /plans/${LUNCH.questId}`, { status: 200, body: PLAN_QUEST.quest });
    const user = await askOnMap(server, replyOf({ ...MEAL_ANSWER_MENUS, planSet: LUNCH, adding: ADDING, note: LATE }));

    await user.press(beside().getByRole('button', { name: '지은이 초대 보내기' }));
    await pass(500);

    expect(dock().getByText('지은에게 초대를 보냈어요')).toBeVisible();
  });
});

describe('an answer with no plan beside a Quest the User holds', () => {
  it('stands the lunch’s reasons beside 파티 보기, which opens it', async () => {
    const noPlan = { ...MEAL_ANSWER_MENUS, plans: [], noPlan: NO_TIME, planSet: LUNCH, adding: ADDING };
    const user = await askOnMap(server, replyOf(noPlan));

    expect(dock().getByText(LATE)).toBeVisible();
    await user.press(beside().getByRole('button', { name: '파티 보기' }));
    await pass(300);

    expect(shownAddress()).toBe(`/room/${LUNCH.questId}`);
  });

  it('stands a meeting’s reasons beside 파티 보기', async () => {
    await askOnMap(server, replyOf({ ...MEET_ANSWER, plans: [], noPlan: NO_TIME, planSet: MEETING }));

    expect(dock().getByText(LATE)).toBeVisible();
    expect(beside().getByRole('button', { name: '파티 보기' })).toBeEnabled();
  });
});
