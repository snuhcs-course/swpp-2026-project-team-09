/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Platform } from 'react-native';
import { apiClient } from '@/api/client';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type { PlanQuest } from '@/api/plan-quest-types';
import type * as PushDevice from '@/push/device';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type * as PushFake from './support/push';
import { pass, screen } from './support/app';
import { askOnMap, card } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { givePushPhone } from './support/push';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// "여기로" (P05-14) against the fake main server, over its stored answer to "배고파" for the User alone (boards s1 and
// s2: 301동식당 where the User is, then 학생회관식당 15 minutes away, the Class at 24동 at 13:00). The Plan becomes a
// Quest the User holds alone through POST /plans, and the card says where the User goes and whether they will be told
// when to leave (boards s4b and s4), from the User's own part of the Plan.

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
jest.mock('@/push/device', () => jest.requireActual<typeof PushDevice>('@/push/device'));
jest.mock('expo', () => jest.requireActual<typeof PushFake>('./support/push').expoModule);
jest.mock('expo-notifications', () => jest.requireActual<typeof PushFake>('./support/push').notificationsModule);

const REPLY = { text: '301동식당에서 먹어요.', mapButtons: [], cards: [], proposal: null, answer: MEAL_ANSWER_ALONE };
// The stored Quest as the main server makes it of a Plan for one person: its asker its one Holder and member.
const [ASKER] = PLAN_QUEST.quest.members ?? [];
const MADE_ALONE: PlanQuest = {
  quest: { ...PLAN_QUEST.quest, members: ASKER === undefined ? [] : [ASKER] },
  invitations: [],
  askLevels: [],
};
const DROP = `DELETE /quests/${MADE_ALONE.quest.id}`;
const HAKGWAN = { latitude: 37.45932, longitude: 126.95058 };
const QUESTION = '나설 시각을 휴대폰으로 알려 드릴까요?';

let server: FakeServer;
let findWalkingRoute = jest.spyOn(apiClient, 'findWalkingRoute');

beforeEach(async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.useFakeTimers({ now: PHONE_NOW });
  findWalkingRoute = jest.spyOn(apiClient, 'findWalkingRoute');
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('POST /plans', { status: 201, body: MADE_ALONE });
  server.on(DROP, { status: 204 });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
  givePushPhone({ permission: 'undetermined' });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof askOnMap>>;

async function take(user: User): Promise<void> {
  await user.press(card().getByRole('button', { name: '여기로' }));
  await pass(500);
}

function made(): unknown[] {
  return server.received('POST /plans').map(({ body }) => body);
}

// Partitions: the Plan where the User is, its request, its card, the push sheet, and "다시 고르기". Expected values:
// boards s1 and s4b.
describe('"여기로" on a Plan where the User is (s1 → s4b)', () => {
  it('makes the Plan on screen into a Quest, and says the User will be told when to leave', async () => {
    const user = await askOnMap(server, REPLY);

    await take(user);

    expect(made()).toEqual([
      {
        input: MEAL_ANSWER_ALONE.input,
        planId: '301동식당',
        startAt: MEAL_ANSWER_ALONE.plans[0]?.startAt,
        location: ON_CAMPUS,
      },
    ]);
    expect(server.received('POST /plans')[0]?.idempotencyKey).toMatch(/^[\da-f-]{36}$/u);
    expect(card().getByText('301동식당에서 먹어요')).toBeVisible();
    expect(card().getByText('12:45에 나설 시각을 알려 드릴게요')).toBeVisible();
    expect(card().getByRole('button', { name: '다시 고르기' })).toBeVisible();
    expect(card().queryByRole('button', { name: '여기로' })).toBeNull();
    expect(card().queryByText(/파티/u)).toBeNull();
  });

  it('asks for the push sheet', async () => {
    const user = await askOnMap(server, REPLY);

    await take(user);

    expect(screen.getByRole('header', { name: QUESTION })).toBeVisible();
  });

  it('"다시 고르기" drops the Quest and shows the Plan again, and a press after it makes a new one', async () => {
    const user = await askOnMap(server, REPLY);
    await take(user);
    await user.press(screen.getByRole('button', { name: '나중에' }));

    await user.press(card().getByRole('button', { name: '다시 고르기' }));
    await pass(500);

    expect(server.received(DROP)).toHaveLength(1);
    expect(card().queryByText('12:45에 나설 시각을 알려 드릴게요')).toBeNull();

    await take(user);

    const keys = server.received('POST /plans').map(({ idempotencyKey }) => idempotencyKey);
    expect(new Set(keys).size).toBe(2);
  });
});

// Partitions: the Plan the User walks to, and "닫기". Expected values: boards s2 and s4.
describe('"여기로" on a Plan the User walks to (s2 → s4)', () => {
  it('says no leave-by is kept for a short walk on, and "닫기" guides the User to the Restaurant', async () => {
    const user = await askOnMap(server, REPLY);
    await user.press(card().getByRole('button', { name: '다음 후보' }));
    await take(user);
    await user.press(screen.getByRole('button', { name: '나중에' }));

    expect(made()).toEqual([expect.objectContaining({ planId: '학생회관식당' })]);
    expect(card().getByText('학생회관식당으로 가요')).toBeVisible();
    expect(card().getByText('수업까지 1분이라 나설 알림은 없어요')).toBeVisible();

    await user.press(card().getByRole('button', { name: '닫기' }));
    await pass(500);

    expect(findWalkingRoute).toHaveBeenLastCalledWith(ON_CAMPUS, HAKGWAN);
    expect(screen.queryByTestId('answer-pill')).toBeNull();
  });
});

// Partitions: a Plan with a Friend, and a failure. Expected values: "이대로 초대" as before, and the failure's toast.
describe('what "여기로" leaves as it was', () => {
  it('does not stand on a Plan with a Friend, which keeps "이대로 초대"', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    expect(MEAL_ANSWER.input.kind).toBe('meal');
    expect(card().getByRole('button', { name: '이대로 초대' })).toBeVisible();
    expect(card().queryByRole('button', { name: '여기로' })).toBeNull();
  });

  it('keeps the Plan on a failure and says so', async () => {
    server.on('POST /plans', { status: 500, body: { statusCode: 500 } });
    const user = await askOnMap(server, REPLY);

    await take(user);

    expect(screen.getByText('답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요')).toBeVisible();
    expect(card().getByRole('button', { name: '여기로' })).toBeVisible();
  });
});
