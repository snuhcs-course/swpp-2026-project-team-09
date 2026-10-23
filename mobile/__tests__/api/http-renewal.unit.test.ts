/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions: a 401 met with no refresh token, with a malformed renewal answer, and with no answer to the renewal.
// Expected values: main-server's README (Sign-in, POST /auth/refresh) and the P09 spec's (f).

import { type FakeServer, refusal, startFakeServer } from '../support/fake-server';
import { ApiError } from '@/api/errors';
import { isFriends } from '@/api/server/answers';
import { call } from '@/api/server/http';
import { heldTokens, keepTokens } from '@/auth/tokens';
import { endSession } from '@/session/session-events';

jest.mock('@/api/servers', () => ({ mainServerUrl: (): string => 'http://main.test' }));
jest.mock('@/auth/tokens', () => ({ heldTokens: jest.fn(), keepTokens: jest.fn() }));
jest.mock('@/session/session-events', () => ({ endSession: jest.fn(), requireOnboarding: jest.fn() }));

const TOKENS = { accessToken: 'expired-access', refreshToken: 'refresh-1' };
const FRIENDS = [{ id: 'f1', name: '김민준', department: '경영학과', sharing: true, visible: false }];

let server: FakeServer;

beforeEach(() => {
  jest.mocked(heldTokens).mockReset().mockReturnValue(TOKENS);
  jest.mocked(keepTokens).mockReset().mockResolvedValue();
  jest.mocked(endSession).mockReset().mockResolvedValue();
  server = startFakeServer();
  server.on('GET /friends', refusal(401));
});

afterEach(() => {
  jest.restoreAllMocks();
});

function listFriends(): Promise<unknown> {
  return call('GET', '/friends', isFriends);
}

describe('a renewal of the Session that cannot be made', () => {
  it('no refresh token held → the Session ends, and no renewal is sent', async () => {
    jest.mocked(heldTokens).mockReturnValue(null);

    await expect(listFriends()).rejects.toMatchObject({ status: 401 });

    expect(server.received('POST /auth/refresh')).toEqual([]);
    expect(endSession).toHaveBeenCalledWith(false);
    expect(server.received('GET /friends')).toHaveLength(1);
  });

  it.each<[string, { status: number; body?: unknown }]>([
    ['no refresh token', { status: 200, body: { accessToken: 'new-access' } }],
    ['no access token', { status: 200, body: { refreshToken: 'refresh-2' } }],
    ['an access token that is a number', { status: 200, body: { accessToken: 1, refreshToken: 'refresh-2' } }],
    ['a refresh token that is null', { status: 200, body: { accessToken: 'new-access', refreshToken: null } }],
    ['no body', { status: 200 }],
  ])('a renewal answer with %s → the Session ends, and no token is kept', async (_, answer) => {
    server.on('POST /auth/refresh', answer);

    await expect(listFriends()).rejects.toMatchObject({ status: 401 });

    expect(endSession).toHaveBeenCalledWith(false);
    expect(keepTokens).not.toHaveBeenCalled();
    expect(server.received('GET /friends')).toHaveLength(1);
  });
});

describe('a renewal of the Session that nothing answers', () => {
  it('no answer to the renewal → that failure is thrown, and the Session is kept', async () => {
    server.on('POST /auth/refresh', 'no-answer');

    const failure: unknown = await listFriends().catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 0, code: null });
    expect(endSession).not.toHaveBeenCalled();
    expect(keepTokens).not.toHaveBeenCalled();
  });

  it('no answer to the renewal → the next refused request renews again, and keeps the new tokens', async () => {
    server.on('POST /auth/refresh', 'no-answer');
    await listFriends().catch(() => null);
    const renewed = { accessToken: 'new-access', refreshToken: 'refresh-2' };
    server.on('POST /auth/refresh', { status: 200, body: renewed });
    server.on('GET /friends', (request) =>
      request.authorization === 'Bearer new-access' ? { status: 200, body: FRIENDS } : refusal(401),
    );
    jest.mocked(keepTokens).mockImplementation((tokens) => {
      jest.mocked(heldTokens).mockReturnValue(tokens);
      return Promise.resolve();
    });

    await expect(listFriends()).resolves.toEqual(FRIENDS);

    expect(server.received('POST /auth/refresh')).toHaveLength(2);
    expect(keepTokens).toHaveBeenCalledWith(renewed);
    expect(endSession).not.toHaveBeenCalled();
  });
});
