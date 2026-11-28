/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import type { KeptNotification } from '@/api/waiting-types';
import { pass, screen, shownAddress } from './support/app';
import { socketServer } from './support/live';
import { recordMoves } from './support/moves';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { ACCEPTED, answerMainScreen, askMainServer, INVITATION, LEAVE_BY, PHONE_NOW } from './support/server';

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
  await user.press(screen.getByRole('tab', { name: bell }));
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

  it('is counted neither by the badge on 파티 nor on the bell once read, nor in the title of 알림', async () => {
    server.on('GET /quest-invitations', { status: 200, body: [INVITATION] });
    server.on('GET /notifications', { status: 200, body: [{ ...ACCEPTED, read: true }] });

    await openNotifications('알림, 새 소식 1개');

    expect(screen.getByRole('header', { name: '알림 1' })).toBeVisible();
    expect(screen.getByRole('button', { name: ROW })).toBeVisible();
    expect(screen.getByRole('tab', { name: '파티, 새 소식 1개', includeHiddenElements: true })).toBeOnTheScreen();
  });
});

// The main server's kept rows, which `POST /notifications/read` marks read where their time has come, as it does.
function keepOnServer(rows: readonly KeptNotification[]): void {
  const kept = structuredClone(rows);
  server.on('GET /notifications', () => ({ status: 200, body: kept }));
  server.on('POST /notifications/read', () => {
    for (const row of kept.filter(({ at }) => Date.parse(at) <= Date.now())) {
      row.read = true;
    }
    return { status: 204 };
  });
}

async function backToMe(user: Awaited<ReturnType<typeof openMain>>): Promise<void> {
  await user.press(screen.getByRole('tab', { name: '내 정보' }));
  await pass(500);
}

describe('an unread kept Notification', () => {
  it('is counted on the bell with what waits, until 알림 is opened, and not by the badge on 파티', async () => {
    server.on('GET /quest-invitations', { status: 200, body: [INVITATION] });
    keepOnServer([{ ...ACCEPTED, read: false }]);
    const user = await openMain();
    await user.press(screen.getByRole('tab', { name: /^내 정보/u }));

    expect(screen.getByRole('tab', { name: '알림, 새 소식 2개' })).toBeVisible();
    expect(screen.getByRole('tab', { name: '파티, 새 소식 1개', includeHiddenElements: true })).toBeOnTheScreen();

    await user.press(screen.getByRole('tab', { name: '알림, 새 소식 2개' }));
    await pass(500);
    expect(screen.getByRole('button', { name: `새 알림 · ${ROW}` })).toBeVisible();
    expect(server.received('POST /notifications/read')).toHaveLength(1);
    await backToMe(user);

    expect(screen.getByRole('tab', { name: '알림, 새 소식 1개' })).toBeVisible();
  });

  it('is not counted while its time is still to come, nor when it is a kind 알림 leaves out', async () => {
    keepOnServer([
      { ...ACCEPTED, id: 'ahead', at: '2026-10-06T13:30:00+09:00', read: false },
      { ...ACCEPTED, id: 'asked', kind: 'join-asked', read: false },
      { ...ACCEPTED, id: 'activated', kind: 'party-activated', read: false },
    ]);
    const user = await openMain();

    await user.press(screen.getByRole('tab', { name: /^내 정보/u }));

    expect(screen.getByRole('tab', { name: '알림' })).toBeVisible();
  });

  it('is counted from the signal `notice` that brings it', async () => {
    keepOnServer([]);
    const user = await openMain();
    await user.press(screen.getByRole('tab', { name: /^내 정보/u }));
    await socketServer((socket) => {
      socket.accept();
    });
    expect(screen.getByRole('tab', { name: '알림' })).toBeVisible();

    keepOnServer([{ ...ACCEPTED, read: false }]);
    await socketServer((socket) => {
      socket.send('notice');
    });
    await pass(100);

    expect(screen.getByRole('tab', { name: '알림, 새 소식 1개' })).toBeVisible();
  });
});

describe('the time to leave in 알림', () => {
  it("shows its title, never the one ahead, and opens the party's card when pressed", async () => {
    // Listed once its time has come; the phone's clock a little behind the main server's still shows its title.
    jest.setSystemTime(new Date('2026-10-06T12:17:00+09:00'));
    server.on('GET /notifications', { status: 200, body: [LEAVE_BY] });
    const user = await openNotifications('알림');

    const row = screen.getByRole('button', { name: '지금 나서요 · 학생회관식당까지 걸어서 15분 · 12:18' });
    expect(screen.queryByText('12:18 나설 시각')).toBeNull();
    expect(screen.getByText('학생회관식당까지 걸어서 15분')).toBeVisible();
    await user.press(row);
    await pass(500);

    expect(screen.queryByRole('header', { name: /^알림/u })).toBeNull();
    expect(screen.getByRole('header', { name: '저녁 약속' })).toBeVisible();
  });
});

describe('a press on a row of 알림 that opens a card on the map', () => {
  it('goes from 알림 to the map with the card in one move, never showing 내 정보 under it (P06 ticket 63)', async () => {
    jest.setSystemTime(new Date('2026-10-06T12:17:00+09:00'));
    server.on('GET /notifications', { status: 200, body: [LEAVE_BY] });
    const user = await openNotifications('알림');
    const moves = recordMoves();

    await user.press(screen.getByRole('button', { name: '지금 나서요 · 학생회관식당까지 걸어서 15분 · 12:18' }));
    await pass(500);

    // One move down to the map: no second tab navigator pushed over 알림, and no stop at 내 정보 on the way.
    expect(moves()).toEqual([['dismissTo', '/main']]);
    expect(screen.queryByRole('header', { name: /^알림/u })).toBeNull();
    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
    expect(screen.getByRole('header', { name: '저녁 약속' })).toBeVisible();
    expect(shownAddress()).toBe('/main');
  });
});
