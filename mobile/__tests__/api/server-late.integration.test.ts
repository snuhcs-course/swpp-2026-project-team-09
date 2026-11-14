/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import { startFresh } from '../support/mocks';
import { askMainServer, PHONE_NOW } from '../support/server';
import { apiClient } from '@/api/client';
import { LATE_WAY } from '@/api/mock/data/late-way';
import { googleAvailable } from '@/auth/google';

// A late report through the main server's client: the minutes and where the phone is go in the body, and the way is
// believed only in the contract's shape.

jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));

const PATH = 'POST /quests/quest-1/late';

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  jest.mocked(googleAvailable).mockReset().mockReturnValue(false);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('a late report to the main server', () => {
  it('posts the minutes and where the phone is, and gives the way', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on(PATH, { status: 200, body: LATE_WAY });
    const location = { latitude: 37.44887, longitude: 126.95265 };

    await expect(apiClient.reportLate('quest-1', 5, location)).resolves.toEqual(LATE_WAY);
    expect(server.received(PATH).map(({ body }) => body)).toEqual([{ minutes: 5, location }]);
  });

  it('posts a null location when the app knows none', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on(PATH, { status: 200, body: LATE_WAY });

    await apiClient.reportLate('quest-1', 15, null);

    expect(server.received(PATH).map(({ body }) => body)).toEqual([{ minutes: 15, location: null }]);
  });

  it('is refused with a way of another shape', async () => {
    const server = await askMainServer({ signedIn: true });
    const { scene: _scene, ...malformed } = LATE_WAY;
    server.on(PATH, { status: 200, body: malformed });

    await expect(apiClient.reportLate('quest-1', 5, null)).rejects.toMatchObject({
      status: 0,
      code: 'UNEXPECTED_ANSWER',
    });
  });
});
