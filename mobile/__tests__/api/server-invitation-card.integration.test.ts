/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import { startFresh } from '../support/mocks';
import { askMainServer, PHONE_NOW } from '../support/server';
import { apiClient } from '@/api/client';
import { INVITATION_CARD } from '@/api/mock/data/invitation-card';
import { googleAvailable } from '@/auth/google';

// An invitation's card through the main server's client: where the phone is goes with the request only when the app
// knows it, and the card is believed only in the contract's shape.

jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));

const PATH = `GET /quest-invitations/${INVITATION_CARD.id}`;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  jest.mocked(googleAvailable).mockReset().mockReturnValue(false);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("an invitation's card from the main server", () => {
  it('asks with where the phone is, and gives the card', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on(PATH, { status: 200, body: INVITATION_CARD });

    await expect(
      apiClient.getInvitationCard(INVITATION_CARD.id, { latitude: 37.45015, longitude: 126.9526 }),
    ).resolves.toEqual(INVITATION_CARD);
    expect(server.received(PATH).map(({ query }) => query)).toEqual([{ latitude: '37.45015', longitude: '126.9526' }]);
  });

  it('asks without a location when the app knows none', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on(PATH, { status: 200, body: INVITATION_CARD });

    await apiClient.getInvitationCard(INVITATION_CARD.id, null);

    expect(server.received(PATH).map(({ query }) => query)).toEqual([{}]);
  });

  it('is refused with a card of another shape', async () => {
    const server = await askMainServer({ signedIn: true });
    const { way: _way, ...malformed } = INVITATION_CARD;
    server.on(PATH, { status: 200, body: malformed });

    await expect(apiClient.getInvitationCard(INVITATION_CARD.id, null)).rejects.toMatchObject({
      status: 0,
      code: 'UNEXPECTED_ANSWER',
    });
  });
});
