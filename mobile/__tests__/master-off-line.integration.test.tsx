/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { act, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { Friend } from '@/api/types';
import { type FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { activationBox, answerMyParty, answerRoom, myPicnicParty, openRoom } from './support/room';
import { answerMainScreen, askMainServer, JI_WOO, LOBBY, MIN_JUN, PHONE_NOW } from './support/server';

// P06 ticket 6 against the fake main server: while the Master Switch is off, each Friend's level on 위치 공유 and the
// room's "내 위치 공유" show off and disabled under one line, and its 켜기 brings back what was stored. 친구 관리 shows
// neither since P15 ticket 2.

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

// The User's own ends, as stored: 정확한 위치 for one, 지금 있는 건물 for the other.
const MIN_SU: Friend = { ...MIN_JUN, level: 'exact', seen: 'timetable' };
const JI_EUN: Friend = { ...JI_WOO, level: 'building', seen: 'timetable' };

const OFF_LINE = '전체 위치 공유가 꺼져 있어요 ·';
const SWITCH_ROUTE = 'PUT /users/me/master-switch';
const LEVEL_ROUTE = `PUT /friends/${MIN_SU.id}/level`;
const PARTY_ROUTE = 'PUT /parties/mine/sharing';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function answerOff(): void {
  server.on('POST /lobby', { status: 200, body: { ...LOBBY, masterSwitch: false } });
  server.on('GET /friends', { status: 200, body: [MIN_SU, JI_EUN] });
  for (const route of [SWITCH_ROUTE, LEVEL_ROUTE, PARTY_ROUTE]) {
    server.on(route, { status: 204 });
  }
  server.on('POST /positions', { status: 200, body: { offCampus: false } });
}

async function open(address: '/me/location-sharing' | '/me/friends'): Promise<Awaited<ReturnType<typeof openMain>>> {
  answerMainScreen(server);
  answerOff();
  const user = await openMain();
  await act(() => {
    router.push(address);
  });
  await pass(500);
  return user;
}

function levels(name: string): ReturnType<typeof within> {
  return within(screen.getByLabelText(`${name}님에게 보일 위치`));
}

describe("The Friends' levels on 위치 공유 while the Master Switch is off", () => {
  it('keep each stored level checked and dimmed, take no press, and come back once 켜기 turns it on', async () => {
    const user = await open('/me/location-sharing');

    expect(screen.getByText(OFF_LINE)).toBeVisible();
    expect(levels(MIN_SU.name).getByRole('radio', { name: '정확한 위치' })).toBeChecked();
    expect(levels(JI_EUN.name).getByRole('radio', { name: '지금 있는 건물' })).toBeChecked();
    for (const name of [MIN_SU.name, JI_EUN.name]) {
      expect(levels(name).getByRole('radio', { name: '시간표만' })).not.toBeChecked();
      for (const words of ['시간표만', '지금 있는 건물', '정확한 위치']) {
        expect(levels(name).getByRole('radio', { name: words })).toBeDisabled();
      }
    }
    await user.press(levels(MIN_SU.name).getByRole('radio', { name: '지금 있는 건물' }));
    expect(server.received(LEVEL_ROUTE)).toHaveLength(0);

    await user.press(screen.getByRole('button', { name: '전체 위치 공유 켜기' }));
    await pass(500);

    expect(server.received(SWITCH_ROUTE).map(({ body }) => body)).toEqual([{ on: true }]);
    expect(screen.queryByText(OFF_LINE)).toBeNull();
    expect(levels(MIN_SU.name).getByRole('radio', { name: '정확한 위치' })).toBeChecked();
    expect(levels(JI_EUN.name).getByRole('radio', { name: '지금 있는 건물' })).toBeChecked();
    expect(levels(MIN_SU.name).getByRole('radio', { name: '시간표만' })).toBeEnabled();
    expect(server.received(LEVEL_ROUTE)).toHaveLength(0);
  });
});

describe('친구 관리 while the Master Switch is off', () => {
  it('shows the Friends without the line or any level', async () => {
    await open('/me/friends');

    for (const name of [MIN_SU.name, JI_EUN.name]) {
      expect(screen.getByRole('button', { name })).toBeVisible();
    }
    expect(screen.queryByText(OFF_LINE)).toBeNull();
    expect(screen.queryByRole('button', { name: '전체 위치 공유 켜기' })).toBeNull();
    expect(screen.queryAllByLabelText(/님에게 보일 위치$/u)).toHaveLength(0);
    expect(screen.queryByText('둘 중 낮은 쪽까지만 서로 보여요. 시간표는 계속 보여요')).toBeNull();
  });
});

function sharing(): ReturnType<typeof screen.getByRole> {
  return activationBox().getByRole('switch', { name: '내 위치 공유' });
}

describe("The room's 내 위치 공유 while the Master Switch is off", () => {
  it('shows off and disabled, and comes back on as stored once 켜기 turns the Master Switch on', async () => {
    answerRoom(server);
    answerOff();
    answerMyParty(server, myPicnicParty());
    const user = await openRoom();

    expect(activationBox().getByText(OFF_LINE)).toBeVisible();
    expect(sharing()).not.toBeChecked();
    expect(sharing()).toBeDisabled();

    await user.press(activationBox().getByRole('button', { name: '전체 위치 공유 켜기' }));
    await pass(500);

    expect(activationBox().queryByText(OFF_LINE)).toBeNull();
    expect(sharing()).toBeChecked();
    expect(sharing()).toBeEnabled();
    expect(server.received(PARTY_ROUTE)).toHaveLength(0);
  });
});
