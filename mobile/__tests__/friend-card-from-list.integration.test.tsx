/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, screen, within } from '@testing-library/react-native';
import type { Friend } from '@/api/types';
import { setAnswerSwitch } from '@/features/assistant/answer-switch';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, shownAddress } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS, openMain, placeOf } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, JI_WOO, MIN_JUN, PHONE_NOW } from './support/server';

// A Friend's row of the main screen's friend list (P02 ticket 21), over the fake main server's Friends: 김민준, whom
// the User sees at the exact position, and 서지우, of whom the User sees the Timetable only and who has no position.
// With the switch on the row opens the same card a press on the face opens; with it off, today's.

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

// 서지우 with the two fields package C adds to GET /friends: the mock's Friend ID of 서지우 (`FRIEND_IDS.f11`) and
// the start of the friendship the mock gives her.
const JI_WOO_PROFILED: Friend = { ...JI_WOO, friendId: 'SJ5U9BVN', friendsSince: '2026-11-05T15:35:00+09:00' };

const LOCATION_OFF = '서지우님은 위치가 꺼져 있어요';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('GET /friends', { status: 200, body: [MIN_JUN, JI_WOO_PROFILED] });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function friendCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('map-card'));
}

function row(friend: Friend): string {
  return `${friend.name} 지도에서 보기`;
}

// Partitions: a Friend on the map and one with no position.
describe("a Friend's row with the switch on", () => {
  it('opens the card of a Friend on the map and brings the map to their face', async () => {
    const user = await openMain({ answerOnMap: true });
    const before = placeOf(MIN_JUN.name);

    await press(user, row(MIN_JUN));

    expect(friendCard().getByRole('header', { name: '김민준' })).toBeVisible();
    expect(friendCard().getByRole('button', { name: '어디까지 보이나' })).toHaveTextContent('정확한 위치까지 보여요');
    expect(placeOf(MIN_JUN.name)).not.toEqual(before);
  });

  it('opens the card of a Friend with no position with what the app holds, says nothing, and moves no map', async () => {
    const user = await openMain({ answerOnMap: true });
    const before = placeOf(MIN_JUN.name);

    await press(user, row(JI_WOO));

    expect(friendCard().getByRole('header', { name: '서지우' })).toBeVisible();
    expect(friendCard().getByText('경영학과')).toBeVisible();
    expect(friendCard().getByRole('button', { name: '어디까지 보이나' })).toHaveTextContent('시간표만 보여요');
    expect(friendCard().getByText('친구 ID SJ5U9BVN')).toBeVisible();
    expect(friendCard().getByText('11월 5일부터 친구')).toBeVisible();
    expect(friendCard().getByRole('button', { name: '파티 만들기' })).toBeVisible();
    expect(friendCard().queryByRole('button', { name: '가까이 보기' })).toBeNull();
    expect(screen.queryByText(LOCATION_OFF)).toBeNull();
    expect(placeOf(MIN_JUN.name)).toEqual(before);
  });
});

// Partitions: the card's ✕, a face pressed while it is open, and the switch turned off while it is open. The rule: one
// card at a time, which the switch's card closes with it.
describe('the open card of a Friend with no position', () => {
  it('closes once the switch is turned off', async () => {
    const user = await openMain({ answerOnMap: true });
    await press(user, row(JI_WOO));
    expect(friendCard().getByRole('header', { name: '서지우' })).toBeVisible();

    await act(() => setAnswerSwitch(false));

    expect(screen.queryByTestId('map-card')).toBeNull();
  });

  it('closes by its ✕', async () => {
    const user = await openMain({ answerOnMap: true });
    await press(user, row(JI_WOO));

    await user.press(friendCard().getByRole('button', { name: '닫기' }));

    expect(screen.queryByTestId('map-card')).toBeNull();
  });

  it('gives way to the card of a face pressed after it, as one card at a time', async () => {
    const user = await openMain({ answerOnMap: true });
    await press(user, row(JI_WOO));

    await press(user, MIN_JUN.name);

    expect(screen.getAllByTestId('map-card')).toHaveLength(1);
    expect(friendCard().getByRole('header', { name: '김민준' })).toBeVisible();
  });
});

// Partitions: a Friend on the map and one with no position.
describe("a Friend's row with the switch off", () => {
  it("opens today's card, whose 어디까지 보이나 opens 위치 공유", async () => {
    const user = await openMain();

    await press(user, row(MIN_JUN));
    await user.press(friendCard().getByRole('button', { name: '어디까지 보이나' }));
    await pass(500);

    expect(shownAddress()).toBe('/me/location-sharing');
  });

  it('says that the location is off for a Friend with no position, and opens no card', async () => {
    const user = await openMain();

    await press(user, row(JI_WOO));

    expect(screen.getByText(LOCATION_OFF)).toBeVisible();
    expect(screen.queryByTestId('map-card')).toBeNull();
  });
});

// Partitions: a Friend on the map and one with no position, both from the list with the switch on.
describe('파티 만들기 on the card', () => {
  it.each([
    ['on the map', MIN_JUN],
    ['with no position', JI_WOO],
  ])('opens the party form as 비공개 with the Friend %s chosen', async (_, friend) => {
    const user = await openMain({ answerOnMap: true });
    await press(user, row(friend));

    await user.press(friendCard().getByRole('button', { name: '파티 만들기' }));
    await pass(500);

    expect(shownAddress()).toBe(`/party-form?friendId=${friend.id}`);
    expect(screen.getByRole('radio', { name: '비공개' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: friend.name })).toBeChecked();
  });
});
