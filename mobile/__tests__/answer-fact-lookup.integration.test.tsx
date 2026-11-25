/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen } from '@testing-library/react-native';
import { MENU_LOOKUP_REPLY } from '@/api/mock/data/menu-lookup';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap, timeBar } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { sockets } from './support/fake-socket';

// An answer that only tells a fact, a Restaurant's hours or its menu (P04 ticket 55, P05 ticket 47): no main button in
// the dock, while its `guide` stays for the Place's card. Partitions: a menu answer marked `fact`; the same without it.

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

describe('a menu answer', () => {
  it('has no main button in the dock when it only tells a fact, though its way stays in its actions', async () => {
    const lookup = { ...MENU_LOOKUP_REPLY.lookup, fact: true as const };
    await askOnMap(server, { ...MENU_LOOKUP_REPLY, lookup });

    expect(lookup.actions.some(({ kind }) => kind === 'guide')).toBe(true);
    expect(screen.queryByTestId('ai-input-beside')).toBeNull();
    expect(screen.queryByRole('button', { name: '길 안내' })).toBeNull();
  });

  it('keeps 길 안내 beside the input without the field, as before', async () => {
    await askOnMap(server, MENU_LOOKUP_REPLY);

    expect(screen.getByRole('button', { name: '길 안내' })).toBeOnTheScreen();
  });

  // Kept from the menu question's Lookup before P04 ticket 72 (PR 573's review): a Lookup's band stands on the time
  // bar without handles, as a way's does and an older main server's menu.
  it('draws its band on the time bar without handles', async () => {
    await askOnMap(server, MENU_LOOKUP_REPLY);

    expect(timeBar().getByText('11:50–12:45 · 식사 55분')).toBeOnTheScreen();
    expect(screen.queryByLabelText('시작 시각')).toBeNull();
    expect(screen.queryByLabelText('끝 시각')).toBeNull();
  });
});
