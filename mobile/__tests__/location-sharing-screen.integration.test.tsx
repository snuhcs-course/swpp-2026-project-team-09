/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by TaeHyun79
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { act, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { Friend } from '@/api/types';
import { type FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { zone, ZONES_ROUTE } from './support/private-zones';
import { answerMainScreen, askMainServer, JI_WOO, LOBBY, MIN_JUN, PHONE_NOW } from './support/server';

// The 위치 공유 screen (P02 ticket 11, board n7b) against the fake main server: its parts in the board's words, with
// no switch of its own since P15 ticket 1, and a Friend's level chosen there, the only place since P15 ticket 2, which
// asks once before it goes down to 시간표만. 켜기 under "친구마다" is in master-off-line.integration.test.tsx.

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

// The board's four Friends: each the User's own end and what the two see of each other.
const MIN_SU: Friend = { ...MIN_JUN, level: 'exact', seen: 'timetable' };
const JI_EUN: Friend = { ...JI_WOO, level: 'building', seen: 'building' };
const SEO_JUN: Friend = {
  ...MIN_JUN,
  id: '6d1c3f5e-5555-4a5b-8c9d-000000000005',
  name: '박서준',
  level: 'exact',
  seen: 'exact',
};
const HA_EUN: Friend = {
  ...JI_WOO,
  id: '6d1c3f5e-6666-4a5b-8c9d-000000000006',
  name: '정하은',
  level: 'timetable',
  seen: 'timetable',
  sharing: false,
};

const LEVEL = `PUT /friends/${SEO_JUN.id}/level`;
const ASKED = 'POST /friends/asked';
const TIMETABLE_ONLY = '서로 시간표만 보여요';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('POST /lobby', { status: 200, body: { ...LOBBY, masterSwitch: true } });
  server.on('GET /friends', { status: 200, body: [SEO_JUN, MIN_SU, HA_EUN, JI_EUN] });
  for (const route of [LEVEL, ASKED]) {
    server.on(route, { status: 204 });
  }
  server.on('POST /positions', { status: 200, body: { offCampus: false } });
  server.on(ZONES_ROUTE, { status: 200, body: { zones: [] } });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const bodies = (route: string): unknown[] => server.received(route).map(({ body }) => body);

async function openScreen(): Promise<Awaited<ReturnType<typeof openMain>>> {
  const user = await openMain();
  await act(() => {
    router.push('/me/location-sharing');
  });
  await pass(500);
  return user;
}

// A Friend's choice of the level named.
function choice(name: string, words: string): ReturnType<typeof screen.getByRole> {
  return within(screen.getByLabelText(`${name}님에게 보일 위치`)).getByRole('radio', { name: words });
}

describe('The way to the 위치 공유 screen', () => {
  it("opens from 내 정보's 위치 공유 card", async () => {
    const user = await openMain();
    await user.press(screen.getByRole('tab', { name: '내 정보' }));
    await pass(500);

    await user.press(screen.getByRole('button', { name: '위치 공유 보기' }));
    await pass(500);

    expect(shownAddress()).toBe('/me/location-sharing');
    expect(screen.getByRole('header', { name: '친구마다' })).toBeVisible();
  });
});

describe('The 위치 공유 screen', () => {
  it("has no switch, starts with 친구마다 and draws each Friend's level and what is never kept, in the board's words", async () => {
    await openScreen();

    const [title, first] = screen.getAllByRole('header');
    expect(title).toHaveTextContent('위치 공유');
    expect(first).toHaveTextContent('친구마다');
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByText('끄면 친구 모두에게 시간표만 보여요')).toBeNull();
    expect(screen.getByLabelText(`김민준, ${TIMETABLE_ONLY}`)).toBeVisible();
    expect(screen.getByLabelText('서지우, 서로 지금 있는 건물까지 보여요')).toBeVisible();
    expect(screen.getByLabelText('박서준, 서로 정확한 위치까지 보여요')).toBeVisible();
    expect(screen.getByLabelText(`정하은, ${TIMETABLE_ONLY}`)).toBeVisible();
    expect(choice('김민준', '정확한 위치')).toBeChecked();
    expect(choice('서지우', '지금 있는 건물')).toBeChecked();
    expect(choice('정하은', '시간표만')).toBeChecked();
    expect(
      screen.getByText('시간표의 건물과 끝나는 시각은 친구 모두에게 보여요. 위치를 꺼도 시간표는 보여요.'),
    ).toBeVisible();
    expect(screen.getByText("새 친구는 '지금 있는 건물'에서 시작해요.")).toBeVisible();
    expect(screen.getByRole('header', { name: '남기지 않는 것' })).toBeVisible();
    expect(screen.getByLabelText('누가 나를 찾았는지 · 기록 안 함')).toBeVisible();
    expect(screen.getByLabelText('지난 위치 · 저장 안 함')).toBeVisible();
    expect(screen.getByText('과목과 강의실은 보이지 않고, 후보로 검토된 것은 누구에게도 알리지 않아요.')).toBeVisible();
  });

  it('reads the Timetable for every Friend while the Master Switch is off, whatever GET /friends says', async () => {
    server.on('POST /lobby', { status: 200, body: { ...LOBBY, masterSwitch: false } });
    await openScreen();

    expect(screen.getByText('전체 위치 공유가 꺼져 있어요 ·')).toBeVisible();
    expect(screen.getAllByLabelText(new RegExp(`, ${TIMETABLE_ONLY}$`, 'u'))).toHaveLength(4);
  });
});

// P02 ticket 29: the way to the zone screen, with the number of zones the User drew.
describe('The 비공개 구역 row', () => {
  it('says 0곳 with no zone', async () => {
    await openScreen();

    expect(screen.getByText('비공개 구역')).toBeVisible();
    expect(screen.getByText('칠한 곳 안에서는 시간표만 보여요')).toBeVisible();
    expect(screen.getByText('0곳')).toBeVisible();
  });

  it('counts the zones and opens the zone screen', async () => {
    server.on(ZONES_ROUTE, { status: 200, body: { zones: [zone(1, '301동 근처'), zone(2, '302동 근처')] } });
    const user = await openScreen();

    expect(screen.getByText('2곳')).toBeVisible();
    await user.press(screen.getByRole('button', { name: /^비공개 구역/u }));
    await pass(500);

    expect(shownAddress()).toBe('/me/private-zones');
    expect(screen.getByText('301동 근처')).toBeVisible();
  });
});

describe('A level on the 위치 공유 screen', () => {
  it('asks once before a level goes down to 시간표만, sets it, and the line follows', async () => {
    server.on(LEVEL, () => {
      const lowered = { ...SEO_JUN, level: 'timetable', seen: 'timetable', sharing: false, askedOff: true };
      server.on('GET /friends', { status: 200, body: [lowered, MIN_SU, HA_EUN, JI_EUN] });
      return { status: 204 };
    });
    const user = await openScreen();

    await user.press(choice('박서준', '시간표만'));

    expect(screen.getByRole('header', { name: '박서준에게는 지금 있는 건물만 보여 줄 수도 있어요.' })).toBeVisible();
    expect(bodies(LEVEL)).toEqual([]);
    await user.press(screen.getByRole('button', { name: '위치 끄기' }));
    await pass(500);

    expect(bodies(LEVEL)).toEqual([{ level: 'timetable' }]);
    expect(bodies(ASKED)).toEqual([{ userIds: [SEO_JUN.id], moment: 'off' }]);
    expect(choice('박서준', '시간표만')).toBeChecked();
    expect(screen.getByLabelText(`박서준, ${TIMETABLE_ONLY}`)).toBeVisible();
  });
});
