/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { KeptNotification } from '@/api/waiting-types';
import { StyleSheet } from 'react-native';
import { color, radius, space } from '@/design-system';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { ACCEPTED, answerMainScreen, askMainServer, DINNER, INVITATION, PHONE_NOW } from './support/server';

// A kept Notification deleted from 알림 by the red action a swipe to the left shows (P06 ticket 40). The swipe itself
// is the gesture handler's; here the action is pressed.

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

const FRIEND_ID = 'c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
// Unread, so that the bell counts it: 알림's mark of read fails below.
const KEPT: KeptNotification = { ...ACCEPTED, id: `accepted:party:${DINNER.id}:${FRIEND_ID}`, read: false };
// Marked new: it was unread when 알림 showed it.
const ROW = '새 알림 · 김민준님이 초대를 수락했어요 · 저녁 약속 · 12:58';
const DELETE = `DELETE /notifications/${encodeURIComponent(KEPT.id)}`;

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('GET /quest-invitations', { status: 200, body: [INVITATION] });
  server.on('POST /notifications/read', refusal(500));
  let kept = [KEPT];
  server.on('GET /notifications', () => ({ status: 200, body: kept }));
  server.on(DELETE, () => {
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
  await user.press(screen.getByRole('tab', { name: '오늘, 새 소식 2개' }));
  await pass(500);
  await user.press(screen.getByRole('button', { name: '알림 모두 보기' }));
  await pass(500);
  return user;
}

describe('the red action of a kept Notification', () => {
  it('is on the kept row only, not on what waits', async () => {
    await openNotifications();

    expect(screen.getByRole('button', { name: ROW })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '윤태오님의 파티 초대 · 물리 실험 보고서' })).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: '알림 지우기' })).toHaveLength(1);
  });

  it('is a red button with rounded corners, inset from the row and from the card’s edge', async () => {
    await openNotifications();

    expect(StyleSheet.flatten(screen.getByRole('button', { name: '알림 지우기' }).props.style)).toMatchObject({
      backgroundColor: color.danger,
      borderRadius: radius.md,
      marginHorizontal: space[2],
      marginVertical: space[1],
    });
  });

  it('deletes the row by its identity when pressed, at once and without a confirm, and the bell no longer counts it', async () => {
    const user = await openNotifications();

    await user.press(screen.getByRole('button', { name: '알림 지우기' }));
    await pass(500);

    expect(server.received(DELETE)).toHaveLength(1);
    expect(screen.queryByRole('button', { name: ROW })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.press(screen.getByRole('button', { name: '뒤로' }));
    await pass(500);
    expect(screen.getByRole('tab', { name: '오늘, 새 소식 1개' })).toBeVisible();
  });

  it('takes the row away before the main server answers', async () => {
    server.on(DELETE, { status: 204, afterMs: 5000 });
    const user = await openNotifications();

    await user.press(screen.getByRole('button', { name: '알림 지우기' }));
    await pass(100);

    expect(screen.queryByRole('button', { name: ROW })).toBeNull();
  });
});
