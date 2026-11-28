/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { KeptNotification } from '@/api/waiting-types';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { ACCEPTED, answerMainScreen, askMainServer, INVITATION, PHONE_NOW } from './support/server';

// 알림's 모두 지우기, which deletes every kept Notification after one question, and leaves what waits (P06 ticket 40).

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

// Read, so that the bell counts only the invitation that waits.
const KEPT: KeptNotification[] = [
  { ...ACCEPTED, id: 'accepted-1', read: true },
  { ...ACCEPTED, id: 'accepted-2', title: '이서연님이 초대를 수락했어요', at: '2026-10-06T09:00:00+09:00', read: true },
];
const ROWS = ['김민준님이 초대를 수락했어요 · 저녁 약속 · 12:58', '이서연님이 초대를 수락했어요 · 저녁 약속 · 09:00'];
const WAITING = '윤태오님의 파티 초대 · 물리 실험 보고서';
const QUESTION = '알림 2개를 지울까요?';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('GET /quest-invitations', { status: 200, body: [INVITATION] });
  let kept = KEPT;
  server.on('GET /notifications', () => ({ status: 200, body: kept }));
  server.on('DELETE /notifications', () => {
    kept = [];
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
  await user.press(screen.getByRole('tab', { name: '오늘, 답할 것 1개' }));
  await pass(500);
  await user.press(screen.getByRole('button', { name: '알림 모두 보기' }));
  await pass(500);
  return user;
}

describe('모두 지우기 of 알림', () => {
  it('is not in the app bar while no kept Notification is shown', async () => {
    server.on('GET /notifications', { status: 200, body: [] });

    await openNotifications();

    expect(screen.getByRole('button', { name: WAITING })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: '모두 지우기' })).toBeNull();
  });

  it('asks once, and 취소 deletes nothing', async () => {
    const user = await openNotifications();

    await user.press(screen.getByRole('button', { name: '모두 지우기' }));
    expect(screen.getByRole('header', { name: QUESTION })).toBeVisible();
    await user.press(screen.getByRole('button', { name: '취소' }));
    await pass(500);

    expect(screen.queryByRole('header', { name: QUESTION })).toBeNull();
    expect(server.received('DELETE /notifications')).toHaveLength(0);
    for (const row of ROWS) {
      expect(screen.getByRole('button', { name: row })).toBeOnTheScreen();
    }
  });
});

describe('지우기 of 모두 지우기', () => {
  it('deletes every kept Notification and leaves what waits', async () => {
    const user = await openNotifications();

    await user.press(screen.getByRole('button', { name: '모두 지우기' }));
    await user.press(screen.getByRole('button', { name: '지우기' }));
    await pass(500);

    expect(server.received('DELETE /notifications')).toHaveLength(1);
    for (const row of ROWS) {
      expect(screen.queryByRole('button', { name: row })).toBeNull();
    }
    expect(screen.getByRole('button', { name: WAITING })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: '모두 지우기' })).toBeNull();
  });

  it('takes the kept rows away before the main server answers', async () => {
    server.on('DELETE /notifications', { status: 204, afterMs: 5000 });
    const user = await openNotifications();

    await user.press(screen.getByRole('button', { name: '모두 지우기' }));
    await user.press(screen.getByRole('button', { name: '지우기' }));
    await pass(100);

    for (const row of ROWS) {
      expect(screen.queryByRole('button', { name: row })).toBeNull();
    }
  });
});
