/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { socketServer } from './support/live';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { ACCEPTED, answerMainScreen, askMainServer, INVITATION, PHONE_NOW } from './support/server';

// The Notifications the main server keeps, in 알림: their rows, where a press on one goes, and what counts them.

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

const ROW = '김민준님이 초대를 수락했어요 · 저녁 약속 · 12:58';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('GET /notifications', { status: 200, body: [ACCEPTED] });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function openNotifications(bell: string): Promise<Awaited<ReturnType<typeof openMain>>> {
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: /^내 정보/u }));
  await user.press(screen.getByRole('button', { name: bell }));
  await pass(500);
  return user;
}

describe('a kept Notification in 알림', () => {
  it('is a row with its title, its line and its time', async () => {
    await openNotifications('알림');

    expect(screen.getByRole('button', { name: ROW })).toBeVisible();
    expect(screen.getByText('김민준님이 초대를 수락했어요')).toBeVisible();
    expect(screen.getByText('12:58')).toBeVisible();
  });

  it("goes to the main screen and opens the party's card when pressed", async () => {
    const user = await openNotifications('알림');

    await user.press(screen.getByRole('button', { name: ROW }));
    await pass(500);

    expect(screen.queryByRole('header', { name: /^알림/u })).toBeNull();
    expect(screen.getByRole('header', { name: '저녁 약속' })).toBeVisible();
    // The test router still prints a cleared parameter's name, as `card=undefined`.
    expect(shownAddress()).toMatch(/^\/main(?:\?card=undefined)?$/u);
  });

  it('is fetched again on the signal `notice`', async () => {
    await openMain();
    await socketServer((socket) => {
      socket.accept();
    });
    const before = server.received('GET /notifications').length;

    await socketServer((socket) => {
      socket.send('notice');
    });
    await pass(100);

    expect(server.received('GET /notifications')).toHaveLength(before + 1);
  });

  it('is counted neither by the badge on 파티 nor on the bell, nor in the title of 알림', async () => {
    server.on('GET /quest-invitations', { status: 200, body: [INVITATION] });

    await openNotifications('알림 1개');

    expect(screen.getByRole('header', { name: '알림 1' })).toBeVisible();
    expect(screen.getByRole('button', { name: ROW })).toBeVisible();
    expect(screen.getByRole('tab', { name: '파티, 새 소식 1개', includeHiddenElements: true })).toBeOnTheScreen();
  });
});
