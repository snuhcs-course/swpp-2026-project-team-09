/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { KeptNotification } from '@/api/waiting-types';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { socketServer } from './support/live';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { ACCEPTED, answerMainScreen, askMainServer, INVITATION, PHONE_NOW } from './support/server';

// The red dot on a kept Notification that was unread when 알림 showed it: it tells the User which rows the bell
// counted, and stays while 알림 is open, though opening it marks them read.

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

const UNREAD: KeptNotification = { ...ACCEPTED, id: 'unread', read: false };
const READ: KeptNotification = {
  ...ACCEPTED,
  id: 'read',
  title: '이서연님이 초대를 수락했어요',
  at: '2026-10-06T12:40:00+09:00',
  read: true,
};
const UNREAD_ROW = '김민준님이 초대를 수락했어요 · 저녁 약속 · 12:58';
const READ_ROW = '이서연님이 초대를 수락했어요 · 저녁 약속 · 12:40';
const INVITATION_ROW = '윤태오님의 파티 초대 · 물리 실험 보고서';

let server: FakeServer;
let kept: KeptNotification[];

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('GET /quest-invitations', { status: 200, body: [INVITATION] });
  kept = [UNREAD, READ];
  server.on('GET /notifications', () => ({ status: 200, body: kept }));
  // As the main server: every row whose time has come is read.
  server.on('POST /notifications/read', () => {
    kept = kept.map((row): KeptNotification => Object.assign({}, row, { read: true }));
    return { status: 204 };
  });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function openNotifications(): Promise<Awaited<ReturnType<typeof openMain>>> {
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: /^내 정보/u }));
  await user.press(screen.getByRole('button', { name: '알림 2개' }));
  await pass(500);
  return user;
}

describe('the new mark in 알림', () => {
  it('is on the row that was unread, not on one read before, nor on what waits', async () => {
    await openNotifications();

    expect(screen.getByRole('button', { name: `새 알림 · ${UNREAD_ROW}` })).toBeVisible();
    expect(screen.getByRole('button', { name: READ_ROW })).toBeVisible();
    expect(screen.getByRole('button', { name: INVITATION_ROW })).toBeVisible();
  });

  it('stays while 알림 is open, after the main server has marked the row read', async () => {
    await openNotifications();
    await pass(2000);

    expect(server.received('POST /notifications/read')).toHaveLength(1);
    expect(kept.every(({ read }) => read === true)).toBe(true);
    expect(screen.getByRole('button', { name: `새 알림 · ${UNREAD_ROW}` })).toBeVisible();
  });

  it('is gone when 알림 is opened again', async () => {
    const user = await openNotifications();
    await user.press(screen.getByRole('button', { name: '뒤로' }));
    await pass(500);

    await user.press(screen.getByRole('button', { name: '알림 1개' }));
    await pass(500);

    expect(screen.getByRole('button', { name: UNREAD_ROW })).toBeVisible();
  });

  it('comes on a row that the signal `notice` brings while 알림 is open', async () => {
    await openNotifications();
    await socketServer((socket) => {
      socket.accept();
    });
    kept = [
      { ...UNREAD, id: 'newer', title: '박지훈님이 초대를 수락했어요', at: '2026-10-06T12:59:00+09:00' },
      ...kept,
    ];

    await socketServer((socket) => {
      socket.send('notice');
    });
    await pass(500);

    expect(
      screen.getByRole('button', { name: '새 알림 · 박지훈님이 초대를 수락했어요 · 저녁 약속 · 12:59' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: `새 알림 · ${UNREAD_ROW}` })).toBeVisible();
  });
});
