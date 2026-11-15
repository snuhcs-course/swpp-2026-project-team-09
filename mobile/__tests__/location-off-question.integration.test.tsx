/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { fireEvent, within } from '@testing-library/react-native';
import { type FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { openFriendScreen } from './support/friends';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, JI_WOO, LOBBY, MIN_JUN, PHONE_NOW } from './support/server';

// The question before location is turned off, asked once for each Friend and once for the Master Switch, against the
// fake main server: its words, what each answer sends, and that the question is recorded whatever the answer.

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

const LEVEL = `PUT /friends/${MIN_JUN.id}/level`;
const ASKED = 'POST /friends/asked';
const SWITCH_ROUTE = 'PUT /users/me/master-switch';
const MASTER_ASKED = 'POST /users/me/master-switch/asked';
const LOWER_ALL = 'PUT /users/me/friend-levels';
const FRIEND_QUESTION = '김민준에게는 지금 있는 건물만 보여 줄 수도 있어요.';
const MASTER_QUESTION = '모든 친구에게는 지금 있는 건물만 보여 줄 수도 있어요.';
const SWITCH = '위치 공유';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  // The levels take a press only while the Master Switch is on.
  server.on('POST /lobby', { status: 200, body: { ...LOBBY, masterSwitch: true } });
  for (const route of [LEVEL, ASKED, SWITCH_ROUTE, MASTER_ASKED, LOWER_ALL]) {
    server.on(route, { status: 204 });
  }
  server.on('POST /positions', { status: 200, body: { offCampus: false } });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const bodies = (route: string): unknown[] => server.received(route).map(({ body }) => body);

// 김민준's choice of the level named.
function choice(words: string): ReturnType<typeof screen.getByRole> {
  return within(screen.getByLabelText('김민준님에게 보일 위치')).getByRole('radio', { name: words });
}

describe("Turning one Friend's location off", () => {
  it.each([
    ['위치 끄기', [{ level: 'timetable' }]],
    ['건물까지만', [{ level: 'building' }]],
    ['취소', []],
  ])('asks the first time with the design words, and %s sends %j and records the question', async (answer, levels) => {
    const user = await openFriendScreen('/me/friends');

    await user.press(choice('시간표만'));

    expect(screen.getByRole('header', { name: FRIEND_QUESTION })).toBeVisible();
    expect(screen.getByText('어느 쪽을 골라도 김민준에게는 아무 표시도 가지 않아요.')).toBeVisible();
    expect(screen.getByText('시간표는 계속 보여요')).toBeVisible();
    expect(bodies(LEVEL)).toEqual([]);
    await user.press(screen.getByRole('button', { name: answer }));
    await pass(500);

    expect(screen.queryByRole('header', { name: FRIEND_QUESTION })).toBeNull();
    expect(bodies(LEVEL)).toEqual(levels);
    expect(bodies(ASKED)).toEqual([{ userIds: [MIN_JUN.id], moment: 'off' }]);
  });

  it('asks once: once the main server keeps the question, the next 시간표만 turns location off at once', async () => {
    server.on(ASKED, () => {
      server.on('GET /friends', { status: 200, body: [{ ...MIN_JUN, askedOff: true }, JI_WOO] });
      return { status: 204 };
    });
    const user = await openFriendScreen('/me/friends');
    await user.press(choice('시간표만'));
    await user.press(screen.getByRole('button', { name: '취소' }));
    await pass(500);

    await user.press(choice('시간표만'));
    await pass(500);

    expect(screen.queryByRole('header', { name: FRIEND_QUESTION })).toBeNull();
    expect(bodies(LEVEL)).toEqual([{ level: 'timetable' }]);
    expect(bodies(ASKED)).toHaveLength(1);
  });

  it('does not ask when the level stays above the Timetable', async () => {
    const user = await openFriendScreen('/me/friends');

    await user.press(choice('지금 있는 건물'));
    await pass(500);

    expect(screen.queryByRole('header', { name: FRIEND_QUESTION })).toBeNull();
    expect(bodies(LEVEL)).toEqual([{ level: 'building' }]);
  });
});

// 내 정보 with the Master Switch on, and whether the app asked about it before.
async function openMe(masterOffAsked: boolean): Promise<Awaited<ReturnType<typeof openMain>>> {
  server.on('POST /lobby', { status: 200, body: { ...LOBBY, masterSwitch: true, masterOffAsked } });
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: '내 정보' }));
  await pass(500);
  return user;
}

async function turnOff(): Promise<void> {
  await fireEvent(screen.getByRole('switch', { name: SWITCH }), 'valueChange', false);
  await pass(0);
}

describe('Turning the Master Switch off', () => {
  it.each([
    ['위치 끄기', false, [{ on: false }], []],
    ['건물까지만', true, [], [{ level: 'building' }]],
    ['취소', true, [], []],
  ])(
    'asks the first time, and %s leaves the switch on %s, sends %j to the switch and %j to every Friend',
    async (answer, on, switched, lowered) => {
      const user = await openMe(false);

      await turnOff();

      expect(screen.getByRole('header', { name: MASTER_QUESTION })).toBeVisible();
      expect(screen.getByText('어느 쪽을 골라도 친구에게는 아무 표시도 가지 않아요.')).toBeVisible();
      expect(screen.getByText('시간표는 계속 보여요')).toBeVisible();
      expect(screen.getByRole('switch', { name: SWITCH })).toBeChecked();
      await user.press(screen.getByRole('button', { name: answer }));
      await pass(500);

      expect(screen.queryByRole('header', { name: MASTER_QUESTION })).toBeNull();
      expect(screen.getByRole('switch', { name: SWITCH, checked: on })).toBeVisible();
      expect(bodies(SWITCH_ROUTE)).toEqual(switched);
      expect(bodies(LOWER_ALL)).toEqual(lowered);
      expect(server.received(MASTER_ASKED)).toHaveLength(1);
    },
  );
});

describe('Turning the Master Switch off once asked', () => {
  it('asks once: after an answer the next turn-off is at once', async () => {
    const user = await openMe(false);
    await turnOff();
    await user.press(screen.getByRole('button', { name: '취소' }));
    await pass(500);

    await turnOff();
    await pass(500);

    expect(screen.queryByRole('header', { name: MASTER_QUESTION })).toBeNull();
    expect(bodies(SWITCH_ROUTE)).toEqual([{ on: false }]);
    expect(server.received(MASTER_ASKED)).toHaveLength(1);
  });

  it('turns off at once when the main server says it asked before', async () => {
    await openMe(true);

    await turnOff();
    await pass(500);

    expect(screen.queryByRole('header', { name: MASTER_QUESTION })).toBeNull();
    expect(bodies(SWITCH_ROUTE)).toEqual([{ on: false }]);
    expect(server.received(MASTER_ASKED)).toHaveLength(0);
  });
});
