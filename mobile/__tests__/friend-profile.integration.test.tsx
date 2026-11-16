/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import type { Friend } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press, wordsUnder, zoomIn } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, JI_WOO, MIN_JUN, PHONE_NOW } from './support/server';

// A Friend's profile card on the everyday map (P02 ticket 18), opened by a press on the face of the fake main server's
// 김민준, whom the User sees at the exact position, over the main server's Friends. The main server's statuses are the
// mock's, which name no Friend of the fake server, so his card has no status line.

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

// 김민준 with the two fields package C adds to GET /friends: the mock's Friend ID of 김민준 (`FRIEND_IDS.f1`) and the
// start of the friendship that ticket 18 names, 3 October.
const MIN_JUN_PROFILED: Friend = { ...MIN_JUN, friendId: 'KM4J8QZA', friendsSince: '2026-10-03T14:05:00+09:00' };

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function profileCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('map-card'));
}

// Partitions: the Friend ID and the date sent and left out.
describe("a Friend's face pressed on the everyday map", () => {
  it('opens the profile: the name, the department, what is seen, the ID, and the date', async () => {
    server.on('GET /friends', { status: 200, body: [MIN_JUN_PROFILED, JI_WOO] });
    const user = await openMain();

    await press(user, MIN_JUN.name);

    expect(profileCard().getByRole('header', { name: '김민준' })).toBeVisible();
    expect(profileCard().getByText('컴퓨터공학부')).toBeVisible();
    expect(profileCard().getByRole('button', { name: '어디까지 보이나' })).toHaveTextContent('정확한 위치까지 보여요');
    expect(profileCard().getByText('친구 ID KM4J8QZA')).toBeVisible();
    expect(profileCard().getByText('10월 3일부터 친구')).toBeVisible();
    expect(profileCard().getByRole('button', { name: '파티 만들기' })).toBeVisible();
  });

  it('leaves out the Friend ID and the date while the main server does not send them', async () => {
    const user = await openMain();

    await press(user, MIN_JUN.name);

    expect(profileCard().getByRole('button', { name: '어디까지 보이나' })).toHaveTextContent('정확한 위치까지 보여요');
    expect(profileCard().queryByText(/^친구 ID/u)).toBeNull();
    expect(profileCard().queryByText(/부터 친구$/u)).toBeNull();
  });
});

// Partitions: the "names" level of detail, where words stand under a face.
describe('the words under a face', () => {
  it('are the full name', async () => {
    const user = await openMain();

    await zoomIn(user, 3);

    expect(wordsUnder(MIN_JUN.name, '김민준')).not.toBeNull();
    expect(wordsUnder(MIN_JUN.name, '민준')).toBeNull();
  });
});
