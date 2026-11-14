/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, LOBBY, PHONE_NOW } from './support/server';
import type { WatchedInterest } from '@/api/interest-types';

// 내 정보 → 관심사 against the fake main server: the profile's hashtags, the watched interests with a way to remove
// each, and a main server that does not watch interests yet (P05 ticket 08).

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

const JOBS: WatchedInterest = {
  id: '0b9f7c5e-2a4d-4e8b-9c1a-3f6e5d7a8b90',
  words: '채용 관련 행사',
  topics: ['채용'],
  createdAt: '2026-10-06T03:12:00.000Z',
};
const BADMINTON: WatchedInterest = {
  id: '1c8e6d4f-3b5e-4f9c-8d2b-4a7f6e8b9ca1',
  words: '배드민턴',
  topics: ['배드민턴', '운동'],
  createdAt: '2026-10-05T09:00:00.000Z',
};

const WATCHED_ONLY = '지켜봐 드리는 것은 행사와 모집뿐이에요';
const NONE_WATCHED = '맡겨 둔 관심이 없어요';
const REMOVE_JOBS = '채용 관련 행사 지우기';

let server: FakeServer;
let watched: WatchedInterest[];

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('POST /lobby', {
    status: 200,
    body: { ...LOBBY, profile: { ...LOBBY.profile, hashtags: ['러닝', '재즈'] } },
  });
  watched = [JOBS, BADMINTON];
  server.on('GET /interests', () => ({ status: 200, body: watched }));
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function openInterests(): Promise<Awaited<ReturnType<typeof openMain>>> {
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: /^내 정보/u }));
  await pass(500);
  await user.press(screen.getByRole('button', { name: /^관심사/u }));
  await pass(500);
  return user;
}

describe('the row of 내 정보', () => {
  it('counts the watched interests', async () => {
    const user = await openMain();
    await user.press(screen.getByRole('tab', { name: /^내 정보/u }));
    await pass(500);

    expect(screen.getByRole('button', { name: '관심사 2' })).toBeVisible();
  });
});

describe('관심사', () => {
  it("lists the profile's hashtags and the watched interests with what they were read as", async () => {
    await openInterests();

    expect(screen.getByRole('header', { name: '관심사' })).toBeVisible();
    expect(screen.getByText('#러닝')).toBeVisible();
    expect(screen.getByText('#재즈')).toBeVisible();
    expect(screen.getByText(WATCHED_ONLY)).toBeVisible();
    expect(screen.getByText('채용 관련 행사')).toBeVisible();
    expect(screen.getByText('채용')).toBeVisible();
    expect(screen.getByText('배드민턴')).toBeVisible();
    expect(screen.getByText('운동')).toBeVisible();
    expect(screen.queryByText(NONE_WATCHED)).toBeNull();
  });

  it('says so when no interest is watched', async () => {
    watched = [];
    await openInterests();

    expect(screen.getByText(NONE_WATCHED)).toBeVisible();
    expect(screen.getByText('#러닝')).toBeVisible();
  });

  it('shows the hashtags and an empty list from a main server that does not watch interests', async () => {
    server.on('GET /interests', { status: 404, body: { statusCode: 404, message: 'Cannot GET /interests' } });
    await openInterests();

    expect(screen.getByText('#러닝')).toBeVisible();
    expect(screen.getByText(NONE_WATCHED)).toBeVisible();
    expect(screen.queryByText('불러오지 못했어요')).toBeNull();
  });

  it('says so when the profile has no hashtags', async () => {
    server.on('POST /lobby', { status: 200, body: { ...LOBBY, profile: { ...LOBBY.profile, hashtags: [] } } });
    await openInterests();

    expect(screen.getByText('프로필에 넣은 관심사가 없어요')).toBeVisible();
  });
});

describe('removing a watched interest', () => {
  it('goes through the route, and its row goes', async () => {
    server.on(`DELETE /interests/${JOBS.id}`, () => {
      watched = [BADMINTON];
      return { status: 204 };
    });
    const user = await openInterests();

    await user.press(screen.getByRole('button', { name: REMOVE_JOBS }));
    await pass(500);

    expect(server.received(`DELETE /interests/${JOBS.id}`)).toHaveLength(1);
    expect(screen.queryByText('채용 관련 행사')).toBeNull();
    expect(screen.getByText('배드민턴')).toBeVisible();
    expect(screen.getByText('관심을 지웠어요')).toBeVisible();
  });

  it('takes one that is gone already as removed', async () => {
    server.on(`DELETE /interests/${JOBS.id}`, () => {
      watched = [BADMINTON];
      return refusal(404, 'INTEREST_NOT_FOUND');
    });
    const user = await openInterests();

    await user.press(screen.getByRole('button', { name: REMOVE_JOBS }));
    await pass(500);

    expect(screen.queryByText('채용 관련 행사')).toBeNull();
    expect(screen.queryByText('지우지 못했어요')).toBeNull();
  });

  it('keeps the row and says so when it fails', async () => {
    server.on(`DELETE /interests/${JOBS.id}`, 'no-answer');
    const user = await openInterests();

    await user.press(screen.getByRole('button', { name: REMOVE_JOBS }));
    await pass(500);

    expect(screen.getByText('채용 관련 행사')).toBeVisible();
    expect(screen.getByText('지우지 못했어요')).toBeVisible();
  });
});
