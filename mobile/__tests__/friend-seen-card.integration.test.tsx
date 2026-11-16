/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, screen, within } from '@testing-library/react-native';
import type { Friend, FriendLevel, Place } from '@/api/types';
import { setAnswerSwitch } from '@/features/assistant/answer-switch';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, shownAddress } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { holdBackButton } from './support/back';
import { answerMainScreen, askMainServer, JI_WOO, LIBRARY_POSITION, LOBBY, MIN_JUN, PHONE_NOW } from './support/server';

// The card "어디까지 보이나" (P02 ticket 21, row 9 board 2), which a Friend's card opens in its place on the everyday
// map while the switch is on, over the fake main server's Friends: 김민준, whom the map shows at the Place the main
// server finds for his position, and 서지우, whom it does not show.

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

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  // The User's Master Switch on, so that a Friend sees the User's own end of the friendship.
  server.on('POST /lobby', { status: 200, body: { ...LOBBY, masterSwitch: true } });
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

type User = Awaited<ReturnType<typeof openMain>>;

// Opens the Friend's card from their row of the friend list, with the switch on, and then "어디까지 보이나".
async function openSeen(friend: Friend): Promise<User> {
  const user = await openMain({ answerOnMap: true });
  await press(user, `${friend.name} 지도에서 보기`);
  await user.press(shownCard().getByRole('button', { name: SEEN }));
  await pass(500);
  return user;
}

// Partitions: a Friend on the map, at a Place, and one whom the map does not show.
describe('어디까지 보이나 in the place of the Friend card', () => {
  it("says the Friend's name with where the map shows them, my end, and what the two see, and never their end", async () => {
    await openSeen(MIN_JUN);

    expect(screen.getAllByTestId('map-card')).toHaveLength(1);
    expect(shownCard().getByText(SEEN)).toBeVisible();
    expect(shownCard().getByRole('header', { name: '김민준 · 지금 301동' })).toBeVisible();
    expect(shownCard().getByText('내가 김민준에게: 정확한 위치')).toBeVisible();
    expect(shownCard().getByText('서로 정확한 위치까지 보여요')).toBeVisible();
    expect(shownCard().queryByText(/나에게:/u)).toBeNull();
    expect(shownCard().queryByText('파티 만들기')).toBeNull();
  });

  it('names a Friend whom the map does not show by name alone', async () => {
    await openSeen(JI_WOO);

    expect(shownCard().getByRole('header', { name: '서지우' })).toBeVisible();
    expect(shownCard().getByText('내가 서지우에게: 정확한 위치')).toBeVisible();
  });
});

// Partitions: `seen` at each of the three levels; my end above `seen` and equal to it, at each level that can be equal.
describe('the words of what the two see', () => {
  it.each<[FriendLevel, FriendLevel, string, string]>([
    ['exact', 'timetable', '정확한 위치', '서로 시간표만 보여요 (낮은 쪽을 따라요)'],
    ['exact', 'building', '정확한 위치', '서로 지금 있는 건물까지 보여요 (낮은 쪽을 따라요)'],
    ['exact', 'exact', '정확한 위치', '서로 정확한 위치까지 보여요'],
    ['building', 'building', '지금 있는 건물', '서로 지금 있는 건물까지 보여요'],
    ['timetable', 'timetable', '시간표만', '서로 시간표만 보여요'],
  ])('with my end %s and seen %s: "%s" and "%s"', async (level, seen, mine, note) => {
    // 김민준's two ends changed for the case; the map still shows him.
    const friend: Friend = { ...MIN_JUN, level, seen, sharing: level !== 'timetable' };
    server.on('GET /friends', { status: 200, body: [friend, JI_WOO] });

    await openSeen(friend);

    expect(shownCard().getByText(`내가 김민준에게: ${mine}`)).toBeVisible();
    expect(shownCard().getByText(note)).toBeVisible();
  });
});

// Partitions: the User's Master Switch on (every case above) and off.
describe("my end with the User's Master Switch off", () => {
  it('is the Timetable only, which the two then see, with no reason after it', async () => {
    server.on('POST /lobby', { status: 200, body: LOBBY });
    // The main server's answer while the User's Master Switch is off: `seen` is the Timetable, `level` the User's choice.
    const friend: Friend = { ...MIN_JUN, seen: 'timetable' };
    server.on('GET /friends', { status: 200, body: [friend, JI_WOO] });

    await openSeen(friend);

    expect(shownCard().getByText('내가 김민준에게: 시간표만')).toBeVisible();
    expect(shownCard().getByText('서로 시간표만 보여요')).toBeVisible();
  });
});

// Partitions: the button pressed over the card, and pressed again after 위치 공유, opened from it, was left by it. The
// rule: the back button takes the steps back that the ✕ takes, as in ticket 18's profile.
describe("Android's back button over the card", () => {
  it('goes back to the Friend card, and a second press closes it', async () => {
    const back = holdBackButton();
    await openSeen(MIN_JUN);

    expect(await back()).toBe(true);
    expect(shownCard().getByRole('header', { name: '김민준' })).toBeVisible();
    expect(await back()).toBe(true);

    expect(screen.queryByTestId('map-card')).toBeNull();
  });

  it('goes back to the Friend card also after 위치 공유 was opened from 바꾸기 and left', async () => {
    const back = holdBackButton();
    const user = await openSeen(MIN_JUN);
    await user.press(shownCard().getByRole('button', { name: '바꾸기' }));
    await pass(500);
    expect(await back()).toBe(true);
    await pass(500);
    expect(shownCard().getByText('내가 김민준에게: 정확한 위치')).toBeVisible();

    expect(await back()).toBe(true);

    expect(shownCard().getByRole('header', { name: '김민준' })).toBeVisible();
  });
});

// Partitions: the switch turned off while the card is shown, then Android's back, or the switch on again. The rule:
// "어디까지 보이나" is shown only while the switch is on, and is gone once it goes off.
describe('the switch turned off while the card is shown', () => {
  it("shows the Friend card, which Android's back closes at once", async () => {
    const back = holdBackButton();
    await openSeen(MIN_JUN);

    await act(() => setAnswerSwitch(false));
    expect(shownCard().getByRole('header', { name: '김민준' })).toBeVisible();
    expect(await back()).toBe(true);

    expect(screen.queryByTestId('map-card')).toBeNull();
  });

  it('leaves the Friend card, not this one, once the switch is on again', async () => {
    await openSeen(MIN_JUN);

    await act(() => setAnswerSwitch(false));
    await act(() => setAnswerSwitch(true));

    expect(shownCard().getByRole('header', { name: '김민준' })).toBeVisible();
    expect(shownCard().getByRole('button', { name: SEEN })).toBeVisible();
  });
});

// Partitions: the card's ✕ and "바꾸기".
describe('what the card leads to', () => {
  it('goes back to the Friend card by its ✕', async () => {
    const user = await openSeen(MIN_JUN);

    await user.press(shownCard().getByRole('button', { name: '닫기' }));

    expect(shownCard().getByRole('header', { name: '김민준' })).toBeVisible();
    expect(shownCard().getByRole('button', { name: SEEN })).toHaveTextContent('정확한 위치까지 보여요');
  });

  it('opens 위치 공유 from 바꾸기', async () => {
    const user = await openSeen(JI_WOO);

    await user.press(shownCard().getByRole('button', { name: '바꾸기' }));
    await pass(500);

    expect(shownAddress()).toBe('/me/location-sharing');
  });
});

// Partitions: the same Friend's face, their row with a position, and their row without one. The rule: a press on the
// Friend means the Friend, whose card it brings back.
describe('the same Friend pressed while the card is shown', () => {
  it.each([
    ['face', MIN_JUN, MIN_JUN.name],
    ['row', MIN_JUN, `${MIN_JUN.name} 지도에서 보기`],
    ['row without a position', JI_WOO, `${JI_WOO.name} 지도에서 보기`],
  ])("brings back the Friend card by the Friend's %s", async (_, friend, pressed) => {
    const user = await openSeen(friend);

    await press(user, pressed);

    expect(shownCard().getByRole('header', { name: friend.name })).toBeVisible();
    expect(shownCard().getByRole('button', { name: SEEN })).toBeVisible();
  });
});

// Partitions: another face pressed while the card is open, and the first face pressed again after it.
describe('a face pressed while the card is open', () => {
  it("opens that Friend's card, and the first Friend's opens again as their card", async () => {
    // 서지우 made visible at a point of her own, so that two faces are on the map.
    const shown: Friend = { ...JI_WOO, visible: true };
    server.on('GET /friends', { status: 200, body: [MIN_JUN, shown] });
    server.on('GET /positions', {
      status: 200,
      body: [LIBRARY_POSITION, { ...LIBRARY_POSITION, userId: JI_WOO.id, latitude: 37.4592 }],
    });
    const user = await openSeen(MIN_JUN);

    await press(user, JI_WOO.name);
    expect(shownCard().getByRole('header', { name: '서지우' })).toBeVisible();
    await press(user, MIN_JUN.name);

    expect(shownCard().getByRole('header', { name: '김민준' })).toBeVisible();
    expect(shownCard().getByRole('button', { name: SEEN })).toBeVisible();
  });
});
