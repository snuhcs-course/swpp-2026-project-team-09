/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { socketServer } from './support/live';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import {
  answerMainScreen,
  askMainServer,
  DINNER,
  DINNER_PARTY,
  FRIEND_REQUESTS,
  INVITATION,
  JOIN_REQUESTS,
  MEETUPS,
  PHONE_NOW,
  STUDY,
} from './support/server';

// 알림 and the badge on 파티, composed from the main server's lists of what waits for the User.

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

const ROWS = [
  '김민준님이 파티를 활성화했어요 · 저녁 먹으러 가요 · 참여하면 위치를 공유해요',
  '한도경님의 친구 요청 · 산업공학과',
  '윤태오님의 파티 초대 · 물리 실험 보고서',
  '이서연님의 파티 초대 · 학관 점심 · 내일 12:10',
  '참여 신청 2명 · 알고리즘 스터디',
];

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('GET /parties', { status: 200, body: [DINNER_PARTY] });
  server.on('GET /friend-requests', { status: 200, body: FRIEND_REQUESTS });
  server.on('GET /quest-invitations', { status: 200, body: [INVITATION] });
  server.on('GET /meetups', {
    status: 200,
    body: {
      ...MEETUPS,
      received: [...MEETUPS.received, { ...MEETUPS.received[0], id: 'mu2', state: 'declined' }],
    },
  });
  server.on('GET /quests', { status: 200, body: [DINNER, STUDY] });
  server.on(`GET /quests/${STUDY.id}/join-requests`, { status: 200, body: JOIN_REQUESTS });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function shownRows(): string[] {
  return screen
    .getAllByRole('button', { name: /님|참여 신청|활성화됐어요/u })
    .map((row) => String(row.props.accessibilityLabel))
    .filter((label) => label.includes(' · '));
}

async function openNotifications(bell = '알림 5개'): Promise<Awaited<ReturnType<typeof openMain>>> {
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: /^내 정보/u }));
  await user.press(screen.getByRole('button', { name: bell }));
  await pass(500);
  return user;
}

describe('알림', () => {
  it("lists what waits for the User in the frame's order, and counts it on the bell and on 파티", async () => {
    await openMain();

    expect(screen.getByRole('tab', { name: '파티, 새 소식 4개' })).toBeVisible();
    await openNotifications();

    expect(screen.getByRole('header', { name: '알림 5' })).toBeVisible();
    expect(shownRows()).toEqual(ROWS);
  });

  it("names nobody in a Party's row when the main server does not tell its Leader", async () => {
    const { leader: _leader, ...withoutLeader } = DINNER_PARTY;
    server.on('GET /parties', { status: 200, body: [withoutLeader] });

    await openNotifications();

    expect(
      screen.getByRole('button', { name: '파티가 활성화됐어요 · 저녁 먹으러 가요 · 참여하면 위치를 공유해요' }),
    ).toBeVisible();
  });
});

describe("a row of 알림's press", () => {
  it.each([ROWS[2], ROWS[3]])('opens 파티 at 초대 from "%s"', async (row) => {
    const user = await openNotifications();

    await user.press(screen.getByRole('button', { name: row }));

    expect(screen.getByRole('tab', { name: /^초대/u })).toBeSelected();
    expect(shownAddress()).toBe('/party?tab=invites');
  });

  it('opens 친구 요청 from a Friend Request', async () => {
    const user = await openNotifications();

    await user.press(screen.getByRole('button', { name: ROWS[1] }));
    await pass(500);

    expect(shownAddress()).toBe('/me/friends/requests');
  });

  it.each([
    [ROWS[0], DINNER.id],
    [ROWS[4], STUDY.id],
  ])('opens the room of the Quest from "%s"', async (row, questId) => {
    const user = await openNotifications();

    await user.press(screen.getByRole('button', { name: row }));
    await pass(500);

    expect(shownAddress()).toBe(`/room/${questId}`);
  });
});

describe('알림 without rows', () => {
  it('says that nothing is new, with no count on the bell or on 파티', async () => {
    answerMainScreen(server);
    server.on('GET /quests', { status: 200, body: [DINNER] });

    await openNotifications('알림');

    expect(screen.getByText('새 알림이 없어요')).toBeVisible();
    expect(screen.getByRole('tab', { name: '파티', includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('leaves out a list that failed', async () => {
    server.on('GET /friend-requests', refusal(404));

    await openNotifications('알림 4개');

    expect(shownRows()).toEqual([ROWS[0], ROWS[2], ROWS[3], ROWS[4]]);
  });

  it('shows the error state when every list failed, and asks again', async () => {
    for (const route of [
      'GET /parties',
      'GET /friend-requests',
      'GET /quest-invitations',
      'GET /meetups',
      'GET /quests',
    ]) {
      server.on(route, refusal(404));
    }
    const user = await openNotifications('알림');

    expect(screen.getByText('불러오지 못했어요')).toBeVisible();
    expect(screen.getByRole('tab', { name: '파티', includeHiddenElements: true })).toBeOnTheScreen();
    server.on('GET /friend-requests', { status: 200, body: FRIEND_REQUESTS });
    await user.press(screen.getByRole('button', { name: '다시 시도' }));
    await pass(500);
    expect(shownRows()).toEqual([ROWS[1]]);
  });
});

describe("알림's count and signals", () => {
  it('shows 9+ on the bell above nine rows', async () => {
    const [request] = FRIEND_REQUESTS.received;
    server.on('GET /friend-requests', {
      status: 200,
      body: { received: Array.from({ length: 6 }, (_, index) => ({ ...request, id: `r${index}` })), sent: [] },
    });
    const user = await openMain();
    await user.press(screen.getByRole('tab', { name: /^내 정보/u }));

    expect(screen.getByRole('button', { name: '알림 10개' })).toBeVisible();
    expect(screen.getByText('9+')).toBeVisible();
  });

  it('follows a signal: a Meetup answered elsewhere leaves the list', async () => {
    await openNotifications();
    await socketServer((socket) => {
      socket.accept();
    });
    server.on('GET /meetups', { status: 200, body: { received: [], sent: [] } });

    await socketServer((socket) => {
      socket.send('meetups-changed');
    });
    await pass(100);

    expect(shownRows()).toEqual([ROWS[0], ROWS[1], ROWS[2], ROWS[4]]);
    expect(screen.getByRole('tab', { name: '파티, 새 소식 3개', includeHiddenElements: true })).toBeOnTheScreen();
  });
});
