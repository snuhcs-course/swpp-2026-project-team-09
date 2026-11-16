/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Platform } from 'react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type * as PushDevice from '@/push/device';
import { keep } from '@/storage/kept';
import type * as SecureStoreFake from '../support/secure-store';
import type * as FakeSocketModule from '../support/fake-socket';
import type * as PushFake from '../support/push';
import { pass, screen } from '../support/app';
import { askOnMap, card } from '../support/answer-map';
import type { FakeServer } from '../support/fake-server';
import { sockets } from '../support/fake-socket';
import { givePhone, ON_CAMPUS } from '../support/main';
import { startFresh } from '../support/mocks';
import { givePushPhone, PHONE_TOKEN, type PushPhone } from '../support/push';
import { REGISTER } from '../support/push-moments';
import { NEW_QUEST_REPLY, POSTED, sayOnMap } from '../support/row-four';
import { answerMainScreen, askMainServer, PHONE_NOW } from '../support/server';

// The sheet that asks about push (board t17) after a Plan of the answer frame is made into a Quest (P02 ticket 30):
// "이대로 초대" of a meal and "이대로 모집" of a new party, as after a booking of the library, against the fake main
// server with the real push wrapper over a mocked `expo-notifications`.

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
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('../support/fake-socket'));
jest.mock('@/push/device', () => jest.requireActual<typeof PushDevice>('@/push/device'));
jest.mock('expo', () => jest.requireActual<typeof PushFake>('../support/push').expoModule);
jest.mock('expo-notifications', () => jest.requireActual<typeof PushFake>('../support/push').notificationsModule);

const QUESTION = '나설 시각을 휴대폰으로 알려 드릴까요?';

let server: FakeServer;
let phone: PushPhone;

beforeEach(async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on(REGISTER, { status: 204 });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
  phone = givePushPhone({ permission: 'undetermined' });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function sheetShown(): boolean {
  return screen.queryByRole('header', { name: QUESTION }) !== null;
}

// Partitions: a meal's Quest made; a new party posted; a making that fails; the sheet shown on the phone before.
describe('the sheet after a Plan made into a Quest', () => {
  it('shows after "이대로 초대", and 알림 받기 asks and registers', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(card().getByRole('button', { name: '이대로 초대' }));
    await pass(500);

    expect(screen.getByRole('header', { name: QUESTION })).toBeVisible();
    await user.press(screen.getByRole('button', { name: '알림 받기' }));
    await pass(500);
    expect(phone.prompts()).toBe(1);
    expect(server.received(REGISTER).map(({ body }) => body)).toEqual([{ token: PHONE_TOKEN }]);
  });

  it('shows after "이대로 모집"', async () => {
    server.on('POST /plans', { status: 201, body: POSTED });
    const user = await sayOnMap(server, '새로 모집', NEW_QUEST_REPLY);

    await user.press(card().getByRole('button', { name: '이대로 모집' }));
    await pass(500);

    expect(card().getByText('파티를 만들고 초대를 보냈어요')).toBeVisible();
    expect(screen.getByRole('header', { name: QUESTION })).toBeVisible();
  });

  it('does not show when the making fails', async () => {
    server.on('POST /plans', { status: 500, body: { statusCode: 500, message: 'Internal' } });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(card().getByRole('button', { name: '이대로 초대' }));
    await pass(500);

    expect(sheetShown()).toBe(false);
  });

  it('does not show once the sheet was shown on the phone', async () => {
    await keep({ pushAsked: true });
    server.on('POST /plans', { status: 201, body: PLAN_QUEST });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(card().getByRole('button', { name: '이대로 초대' }));
    await pass(500);

    expect(card().getByText('파티를 만들고 초대를 보냈어요')).toBeVisible();
    expect(sheetShown()).toBe(false);
  });
});
