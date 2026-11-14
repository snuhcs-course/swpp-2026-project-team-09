/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap, card, mapThings } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import late from '@/api/mock/data/way-lookups/late.json';
import leave from '@/api/mock/data/way-lookups/leave.json';

// A Lookup of a way with a deadline in the answer frame (P01 ticket 11), against the fake main server, which replies
// with the main server's real Lookups of boards q3 (late) and q2 (on time, with a leave-by notification).

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

function replyOf(lookup: object): object {
  return { text: '24동까지 걸어서 15분이에요.', mapButtons: [], cards: [], proposal: null, answer: null, lookup };
}

// Partitions: a late way and one on time. Expected values: the copies of boards q3 and q2, and the decision that only
// a late way opens with its basis shown.
describe('the basis of a way', () => {
  it('opens on its own for a way that is late, with "근거 접기", and the map flags the lateness', async () => {
    await askOnMap(server, replyOf(late));

    expect(card().getByText('걸어서 15분 · 지금 12:50')).toBeVisible();
    expect(card().getByRole('button', { name: '근거 접기' })).toBeVisible();
    expect(mapThings()).toContain('13:05 도착 · 5분 늦어요');
  });

  it('stays closed for a way on time, whose main button is "길 안내" until the leave-by notification is drawn', async () => {
    await askOnMap(server, replyOf(leave));

    expect(card().queryByText('301동 → 24동 걸어서 15분')).toBeNull();
    expect(card().getByRole('button', { name: '근거' })).toBeVisible();
    expect(card().getByRole('button', { name: '길 안내' })).toBeVisible();
    expect(mapThings()).toContain('12:45 나서기');
  });
});
