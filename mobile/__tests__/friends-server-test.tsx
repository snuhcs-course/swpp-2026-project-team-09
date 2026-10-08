import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { act, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, startApp } from './support/app';
import { idTokenOf } from './support/id-token';
import { FRIEND_PILL } from './support/lists';
import { openLive, SIGN_IN, socketServer } from './support/live';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { lookOf, wordsUnder, zoomIn } from './support/markers';
import { startFresh } from './support/mocks';
import {
  answerMainScreen,
  askMainServer,
  JI_WOO,
  LIBRARY_POSITION,
  MIN_JUN,
  PHONE_NOW,
  TOKENS,
} from './support/server';
import { askGoogle } from '@/auth/google';
import { keep, readKept } from '@/storage/kept';

// The friend screens, the Invite Link's accept screen and the Friends on the map, against the fake main server and
// the fake socket server.

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

const TOKEN = 'k3J9xQ';
const SENDER = { name: '유지안', department: '경제학부' };
const INVITE = '유지안님의 친구 초대';
const REQUESTS = {
  received: [{ id: 'r1', sender: { name: '한도경', department: '산업공학과' }, sentAt: '2026-10-06T03:00:00.000Z' }],
  sent: [],
};

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('GET /friend-requests', { status: 200, body: REQUESTS });
  server.on(`GET /invite-links/${TOKEN}`, { status: 200, body: { sender: SENDER, status: 'usable' } });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function openLink(): Promise<void> {
  await act(() => {
    router.push(`/invite/${TOKEN}`);
  });
  await pass(500);
}

describe('opening an Invite Link', () => {
  it('shows the accept screen at once while signed in', async () => {
    await openMain();
    await openLink();

    expect(screen.getByRole('header', { name: INVITE })).toBeVisible();
    expect(screen.getByText('경제학부')).toBeVisible();
    expect(
      screen.getByText('수락하면 친구가 되고, 서로의 위치를 지도에서 볼 수 있어요. 위치 공유는 친구마다 끌 수 있어요.'),
    ).toBeVisible();
  });

  it('shows the accept screen after the loading screen, at a start of the app', async () => {
    await keep({ signedIn: true, consented: true, onboardingCompleted: true });
    await startApp(`/invite/${TOKEN}`);
    await pass(1000);
    await pass(1000);

    expect(screen.getByRole('header', { name: INVITE })).toBeVisible();
    expect((await readKept()).inviteToken).toBeNull();
  });

  it('keeps the link while signed out, and shows it after the sign-in', async () => {
    server = await askMainServer({ signedIn: false });
    answerMainScreen(server);
    server.on(`GET /invite-links/${TOKEN}`, { status: 200, body: { sender: SENDER, status: 'usable' } });
    server.on('POST /auth/google', { status: 200, body: { ...TOKENS, onboarding: { completed: true } } });
    jest.mocked(askGoogle).mockResolvedValue({
      kind: 'token',
      idToken: idTokenOf({ email: 'gildong@snu.ac.kr', hd: 'snu.ac.kr', name: '홍길동' }),
    });
    await keep({ consented: true });
    await startApp(`/invite/${TOKEN}`);
    await pass(1000);
    expect((await readKept()).inviteToken).toBe(TOKEN);

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.press(screen.getByRole('button', { name: SIGN_IN }));
    await pass(1000);
    await pass(1000);

    expect(screen.getByRole('header', { name: INVITE })).toBeVisible();
  });
});

describe('the accept screen', () => {
  it('accepts, closes on 지도 and says so', async () => {
    server.on(`POST /invite-links/${TOKEN}/accept`, { status: 204 });
    const user = await openMain();
    await openLink();

    await user.press(screen.getByRole('button', { name: '수락' }));
    await pass(500);

    expect(server.received(`POST /invite-links/${TOKEN}/accept`)).toHaveLength(1);
    expect(screen.queryByRole('header', { name: INVITE })).toBeNull();
    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
    expect(screen.getByText('유지안님과 친구가 됐어요')).toBeVisible();
  });

  it('declines without sending anything', async () => {
    const user = await openMain();
    await openLink();

    await user.press(screen.getByRole('button', { name: '거절' }));
    await pass(500);

    expect(server.received(`POST /invite-links/${TOKEN}/accept`)).toHaveLength(0);
    expect(screen.queryByRole('header', { name: INVITE })).toBeNull();
  });

  it.each([
    ['used', '이미 사용된 초대 링크예요', null],
    ['expired', '기간이 지난 초대 링크예요', '초대 링크는 만든 뒤 24시간 동안 쓸 수 있어요. 새 링크를 받아 주세요.'],
    ['own', '내가 보낸 초대 링크예요', '친구에게 보내 주세요.'],
    ['friend', '유지안님과는 이미 친구예요', null],
  ])('shows a %s link with its message and 확인', async (status, title, body) => {
    server.on(`GET /invite-links/${TOKEN}`, { status: 200, body: { sender: SENDER, status } });
    const user = await openMain();
    await openLink();

    expect(screen.getByRole('header', { name: title })).toBeVisible();
    if (body !== null) {
      expect(screen.getByText(body)).toBeVisible();
    }
    await user.press(screen.getByRole('button', { name: '확인' }));
    expect(screen.queryByRole('header', { name: title })).toBeNull();
  });
});

describe('the accept screen for a link that cannot be accepted', () => {
  it('shows a token nobody made', async () => {
    server.on(`GET /invite-links/${TOKEN}`, refusal(404, 'INVITE_LINK_NOT_FOUND'));
    await openMain();
    await openLink();

    expect(screen.getByRole('header', { name: '찾을 수 없는 초대 링크예요' })).toBeVisible();
  });
});

describe('the refusals on accepting', () => {
  it.each([
    [409, 'INVITE_LINK_USED', '이미 사용된 초대 링크예요'],
    [410, 'INVITE_LINK_EXPIRED', '기간이 지난 초대 링크예요'],
    [400, 'OWN_INVITE_LINK', '내가 보낸 초대 링크예요'],
    [409, 'ALREADY_FRIENDS', '유지안님과는 이미 친구예요'],
    [404, 'INVITE_LINK_NOT_FOUND', '찾을 수 없는 초대 링크예요'],
  ])('shows the refusal %s %s on accepting', async (status, code, title) => {
    server.on(`POST /invite-links/${TOKEN}/accept`, refusal(status, code));
    const user = await openMain();
    await openLink();

    await user.press(screen.getByRole('button', { name: '수락' }));
    await pass(500);

    expect(screen.getByRole('header', { name: title })).toBeVisible();
  });
});

describe('Friends on the map', () => {
  it("shows a Friend's Avatar as positions come, dims it after 2 minutes and takes it off after 10", async () => {
    server.on('GET /positions', { status: 200, body: [] });
    const socket = await openLive();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    expect(screen.queryByRole('button', { name: '김민준' })).toBeNull();

    await socketServer(() => {
      socket.send('position', { ...LIBRARY_POSITION, measuredAt: new Date().toISOString() });
    });
    expect(screen.getByRole('button', { name: '김민준' })).toBeVisible();
    await zoomIn(user, 3);
    expect(lookOf('김민준')).not.toMatch(/:old/u);

    await pass(150_000);
    expect(lookOf('김민준')).toMatch(/:old/u);
    expect(wordsUnder('김민준', '민준 · 2분 전')).not.toBeNull();
    expect(screen.getByText('공강 · 2분 전 위치')).toBeVisible();

    await pass(480_000);
    expect(screen.queryByRole('button', { name: '김민준' })).toBeNull();
  });

  it('shows no Avatar for a Friend who is not visible, and 위치 꺼짐 in the lists', async () => {
    const user = await openMain();

    expect(screen.queryByRole('button', { name: '서지우' })).toBeNull();
    expect(screen.getByText('위치 꺼짐')).toBeVisible();
    await user.press(screen.getByRole('button', { name: '서지우 지도에서 보기' }));
    expect(screen.getByText('서지우님은 위치가 꺼져 있어요')).toBeVisible();
  });
});

async function signal(): Promise<void> {
  await socketServer((socket) => {
    socket.send('friends-changed');
  });
  await pass(500);
}

function changeFriends(): void {
  server.on('GET /friends', { status: 200, body: [MIN_JUN, { ...JI_WOO, visible: true }] });
  server.on('GET /friend-requests', { status: 200, body: { received: [], sent: [] } });
}

describe('friends-changed', () => {
  it("refreshes the friend panel's count", async () => {
    await openLive();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.press(screen.getByRole('button', { name: FRIEND_PILL }));
    expect(screen.getByText('친구 1명과 위치 공유 중')).toBeVisible();

    changeFriends();
    await signal();

    expect(screen.getByText('친구 2명과 위치 공유 중')).toBeVisible();
  });

  it('refreshes 친구 관리 and 친구 요청', async () => {
    await openLive();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await act(() => {
      router.push('/me/friends');
    });
    await pass(500);
    expect(screen.getByText('경영학과 · 위치 꺼짐')).toBeVisible();
    await user.press(screen.getByRole('button', { name: '친구 요청 1' }));
    await pass(500);
    expect(screen.getByText('한도경')).toBeVisible();

    changeFriends();
    await signal();

    expect(screen.getByText('받은 요청이 없어요')).toBeVisible();
    await user.press(screen.getByRole('button', { name: '뒤로' }));
    expect(screen.getByRole('button', { name: '친구 요청 0' })).toBeVisible();
    expect(screen.queryByText('경영학과 · 위치 꺼짐')).toBeNull();
  });
});
