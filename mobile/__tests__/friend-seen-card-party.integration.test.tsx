/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import type { Friend, MyParty, Place } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, JI_WOO, LOBBY, ME_ID, MIN_JUN, PHONE_NOW } from './support/server';

// "어디까지 보이나" (P02 ticket 21) of a Friend in the User's Party, and while the User's Party is not known, over the
// fake main server. The rule: the main server gives a common Party the exact position, which `seen` of GET /friends
// leaves out, so the card says what the User's own card says of the same Friend (ticket 19, decision 5).

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

const ENGINEERING: Place = { id: 'p301', number: '301', name: '제1공학관', latitude: 37.45016, longitude: 126.95259 };

const SEEN = '어디까지 보이나';

// 김민준 with both ends of the friendship at the Timetable, so that only the Party can give more: the review's case.
const MIN_JUN_TIMETABLE: Friend = { ...MIN_JUN, level: 'timetable', seen: 'timetable', sharing: false };

// The User's Party with 김민준 and 서지우, the User's own switch for it on.
const LUNCH: MyParty = {
  id: 'p1',
  title: '점심 같이',
  capacity: 4,
  joinPolicy: 'open',
  quest: null,
  sharing: true,
  members: [
    { id: ME_ID, name: '홍길동', department: '컴퓨터공학부', leader: true, visible: true },
    { id: MIN_JUN.id, name: MIN_JUN.name, department: MIN_JUN.department, leader: false, visible: true },
    { id: JI_WOO.id, name: JI_WOO.name, department: JI_WOO.department, leader: false, visible: false },
  ],
};

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('POST /lobby', { status: 200, body: { ...LOBBY, masterSwitch: true } });
  server.on('GET /friends', { status: 200, body: [MIN_JUN_TIMETABLE, JI_WOO] });
  server.on('GET /parties/mine', { status: 200, body: LUNCH });
  server.on('GET /places/at', { status: 200, body: { place: ENGINEERING, relation: 'inside' } });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function shownCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('map-card'));
}

// Opens the Friend's card from their row of the friend list, `waitMs` after the main screen is
// shown, and then "어디까지 보이나".
async function openSeen(friend: Friend, waitMs = 0): Promise<void> {
  const user = await openMain();
  await pass(waitMs);
  await press(user, `${friend.name} 지도에서 보기`);
  await user.press(shownCard().getByRole('button', { name: SEEN }));
  await pass(500);
}

// Partitions: a Friend in the User's Party with the User's own switch for it on, and off.
describe("a Friend in the User's Party", () => {
  it('reads the exact position by the Party at both ends, never the Timetable of the friendship', async () => {
    await openSeen(MIN_JUN_TIMETABLE);

    expect(shownCard().getByText('내가 김민준에게: 정확한 위치 · 파티 중')).toBeVisible();
    expect(shownCard().getByText('파티 중에는 서로 정확한 위치까지 보여요')).toBeVisible();
    expect(shownCard().queryByText(/시간표만/u)).toBeNull();
  });

  it("reads what the friendship gives while the User's own switch for the Party is off", async () => {
    server.on('GET /parties/mine', { status: 200, body: { ...LUNCH, sharing: false } });

    await openSeen(MIN_JUN_TIMETABLE);

    expect(shownCard().getByText('내가 김민준에게: 시간표만')).toBeVisible();
    expect(shownCard().getByText('서로 시간표만 보여요')).toBeVisible();
  });
});

// Partitions: GET /parties/mine still on its way, then answered; and failed. 서지우 has no position, so her card opens
// while the map's own cards still wait for the Party.
describe("the card while the User's Party is not known", () => {
  it('says no level until the Party is read, and then the Party', async () => {
    server.on('GET /parties/mine', { status: 200, body: LUNCH, afterMs: 10_000 });

    await openSeen(JI_WOO);
    expect(shownCard().getByRole('header', { name: JI_WOO.name })).toBeVisible();
    expect(shownCard().getByRole('button', { name: '바꾸기' })).toBeVisible();
    expect(shownCard().queryByText(/에게:/u)).toBeNull();
    expect(shownCard().queryByText(/보여요/u)).toBeNull();
    await pass(10_000);

    expect(shownCard().getByText('내가 서지우에게: 정확한 위치 · 파티 중')).toBeVisible();
  });

  it('says no level, and never the Timetable, once the Party cannot be read', async () => {
    server.on('GET /parties/mine', { status: 500, body: { statusCode: 500, message: 'Internal Server Error' } });

    // Past the one retry of a failed read.
    await openSeen(MIN_JUN_TIMETABLE, 3000);

    expect(shownCard().getByRole('header', { name: '김민준 · 지금 301동' })).toBeVisible();
    expect(shownCard().queryByText(/에게:/u)).toBeNull();
    expect(shownCard().queryByText(/시간표만|보여요/u)).toBeNull();
  });
});
