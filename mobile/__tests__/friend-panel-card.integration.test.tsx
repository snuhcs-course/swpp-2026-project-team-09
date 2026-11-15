/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import type { Friend } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, shownAddress } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { FRIEND_PILL } from './support/lists';
import { givePhone, ON_CAMPUS, openMain, placeOf } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, JI_WOO, MIN_JUN, PHONE_NOW } from './support/server';

// A Friend's row of the friend panel, the whole list the pill "친구" opens (P02 ticket 21), over the fake main server's
// Friends: 김민준, whom the map shows, and 서지우, who has no position. With the switch on a row closes the panel and
// opens the Friend's card, as a row of the list over the map does; with it off, a row takes no press.

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

type User = Awaited<ReturnType<typeof openMain>>;

// Opens the panel over the main screen, and gives where 김민준's face stood before.
async function openPanel(answerOnMap: boolean): Promise<{ user: User; before: ReturnType<typeof placeOf> }> {
  const user = await openMain({ answerOnMap });
  const before = placeOf(MIN_JUN.name);
  await press(user, FRIEND_PILL);
  return { user, before };
}

function row(friend: Friend): string {
  return `${friend.name} 프로필`;
}

function panelShown(): boolean {
  return screen.queryByRole('header', { name: /^친구/u }) !== null;
}

function friendCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('map-card'));
}

// Partitions: a Friend on the map and one with no position; the row's calendar button.
describe('a row of the friend panel with the switch on', () => {
  it('closes the panel and opens the card of a Friend on the map, bringing the map to their face', async () => {
    const { user, before } = await openPanel(true);

    await press(user, row(MIN_JUN));

    expect(panelShown()).toBe(false);
    expect(friendCard().getByRole('header', { name: '김민준' })).toBeVisible();
    expect(placeOf(MIN_JUN.name)).not.toEqual(before);
  });

  it('closes the panel and opens the card of a Friend with no position, where the map is', async () => {
    const { user, before } = await openPanel(true);

    await press(user, row(JI_WOO));

    expect(panelShown()).toBe(false);
    expect(friendCard().getByRole('header', { name: '서지우' })).toBeVisible();
    expect(screen.queryByText('서지우님은 위치가 꺼져 있어요')).toBeNull();
    expect(placeOf(MIN_JUN.name)).toEqual(before);
  });

  it('keeps its calendar button, which opens 파티 만들기 with the Friend', async () => {
    const { user } = await openPanel(true);

    await press(user, `${JI_WOO.name}님과 파티 만들기`);
    await pass(500);

    expect(shownAddress()).toBe(`/party-form?friendId=${JI_WOO.id}`);
  });
});

// Partitions: the switch off.
describe('a row of the friend panel with the switch off', () => {
  it('takes no press, as today', async () => {
    await openPanel(false);

    expect(panelShown()).toBe(true);
    expect(screen.queryByRole('button', { name: row(JI_WOO) })).toBeNull();
    expect(screen.queryByRole('button', { name: row(MIN_JUN) })).toBeNull();
  });
});
