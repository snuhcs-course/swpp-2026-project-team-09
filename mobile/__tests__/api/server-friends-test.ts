// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import type * as SecureStoreFake from '../support/secure-store';
import { type FakeServer, refusal } from '../support/fake-server';
import { startFresh } from '../support/mocks';
import { askMainServer, MIN_JUN, PHONE_NOW, TOKENS } from '../support/server';
import { apiClient } from '@/api/client';
import { ApiError } from '@/api/errors';

// The operations of Friends and Invite Links against the main server: each route, its body and its refusals.

jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));

const BEARER = `Bearer ${TOKENS.accessToken}`;
const OWNER = { name: '유지안', department: '경제학부' };

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  server = await askMainServer({ signedIn: true });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function refusalOf(asked: Promise<unknown>): Promise<[number, string | null]> {
  try {
    await asked;
  } catch (error) {
    if (error instanceof ApiError) {
      return [error.status, error.code];
    }
    throw error;
  }
  throw new Error('It was not refused');
}

describe("a friendship's switch and its end", () => {
  it('turns the switch with PUT /friends/:userId/sharing', async () => {
    server.on(`PUT /friends/${MIN_JUN.id}/sharing`, { status: 204 });

    await apiClient.setFriendSharing(MIN_JUN.id, false);

    expect(server.received(`PUT /friends/${MIN_JUN.id}/sharing`)).toEqual([
      expect.objectContaining({ authorization: BEARER, body: { on: false } }),
    ]);
  });

  it('ends a friendship with DELETE /friends/:userId, and is refused for a User who is no Friend', async () => {
    server.on(`DELETE /friends/${MIN_JUN.id}`, { status: 204 });
    await apiClient.endFriendship(MIN_JUN.id);
    expect(server.received(`DELETE /friends/${MIN_JUN.id}`)).toHaveLength(1);

    server.on(`DELETE /friends/${MIN_JUN.id}`, refusal(404, 'FRIEND_NOT_FOUND'));
    expect(await refusalOf(apiClient.endFriendship(MIN_JUN.id))).toEqual([404, 'FRIEND_NOT_FOUND']);
    server.on(`PUT /friends/${MIN_JUN.id}/sharing`, refusal(404, 'FRIEND_NOT_FOUND'));
    expect(await refusalOf(apiClient.setFriendSharing(MIN_JUN.id, true))).toEqual([404, 'FRIEND_NOT_FOUND']);
  });
});

describe('Friend IDs and Friend Requests', () => {
  it("looks a Friend ID's owner up with GET /friend-ids/:friendId", async () => {
    server.on('GET /friend-ids/YJ7A4Y6Z', { status: 200, body: OWNER });
    expect(await apiClient.findFriendId('YJ7A4Y6Z')).toEqual(OWNER);

    server.on('GET /friend-ids/ZZZZZZZZ', refusal(404, 'FRIEND_ID_NOT_FOUND'));
    expect(await refusalOf(apiClient.findFriendId('ZZZZZZZZ'))).toEqual([404, 'FRIEND_ID_NOT_FOUND']);
  });

  it('sends a Friend Request with POST /friend-requests', async () => {
    server.on('POST /friend-requests', { status: 201, body: { status: 'waiting' } });

    expect(await apiClient.sendFriendRequest('YJ7A4Y6Z')).toEqual({ status: 'waiting' });
    expect(server.received('POST /friend-requests')[0]?.body).toEqual({ friendId: 'YJ7A4Y6Z' });

    server.on('POST /friend-requests', { status: 201, body: { status: 'friends' } });
    expect(await apiClient.sendFriendRequest('YJ7A4Y6Z')).toEqual({ status: 'friends' });
  });

  it.each([
    [400, 'OWN_FRIEND_ID'],
    [409, 'ALREADY_FRIENDS'],
    [409, 'FRIEND_REQUEST_ALREADY_SENT'],
    [404, 'FRIEND_ID_NOT_FOUND'],
  ])('passes on the refusal %s %s of a Friend Request', async (status, code) => {
    server.on('POST /friend-requests', refusal(status, code));

    expect(await refusalOf(apiClient.sendFriendRequest('YJ7A4Y6Z'))).toEqual([status, code]);
  });
});

describe('the list of Friend Requests and its answers', () => {
  it('lists the requests with GET /friend-requests', async () => {
    const requests = {
      received: [{ id: 'r1', sender: OWNER, sentAt: '2026-10-06T03:00:00.000Z' }],
      sent: [{ id: 'r2', receiver: { name: '백승호', department: '작곡과' }, sentAt: '2026-10-06T02:00:00.000Z' }],
    };
    server.on('GET /friend-requests', { status: 200, body: requests });

    expect(await apiClient.listFriendRequests()).toEqual(requests);
  });

  it.each(['accept', 'decline', 'cancel'] as const)(
    'answers a request with POST /friend-requests/:id/%s, refused for one that waits no more',
    async (answer) => {
      const send = {
        accept: apiClient.acceptFriendRequest,
        decline: apiClient.declineFriendRequest,
        cancel: apiClient.cancelFriendRequest,
      }[answer];
      server.on(`POST /friend-requests/r1/${answer}`, { status: 204 });
      await send('r1');
      expect(server.received(`POST /friend-requests/r1/${answer}`)).toHaveLength(1);

      server.on(`POST /friend-requests/r1/${answer}`, refusal(404, 'FRIEND_REQUEST_NOT_FOUND'));
      expect(await refusalOf(send('r1'))).toEqual([404, 'FRIEND_REQUEST_NOT_FOUND']);
    },
  );
});

describe('Invite Links', () => {
  it('creates one with POST /invite-links', async () => {
    const link = { url: 'https://snunow.example/invite/abc', expiresAt: '2026-10-07T04:00:00.000Z' };
    server.on('POST /invite-links', { status: 201, body: link });

    expect(await apiClient.createInviteLink()).toEqual(link);
  });

  it('reads one with GET /invite-links/:token, refused for a token nobody made', async () => {
    server.on('GET /invite-links/abc', { status: 200, body: { sender: OWNER, status: 'usable' } });
    expect(await apiClient.getInviteLink('abc')).toEqual({ sender: OWNER, status: 'usable' });

    server.on('GET /invite-links/abc', refusal(404, 'INVITE_LINK_NOT_FOUND'));
    expect(await refusalOf(apiClient.getInviteLink('abc'))).toEqual([404, 'INVITE_LINK_NOT_FOUND']);
  });

  it.each([
    [400, 'OWN_INVITE_LINK'],
    [409, 'INVITE_LINK_USED'],
    [410, 'INVITE_LINK_EXPIRED'],
    [409, 'ALREADY_FRIENDS'],
    [404, 'INVITE_LINK_NOT_FOUND'],
  ])('accepts one with POST /invite-links/:token/accept, and passes on %s %s', async (status, code) => {
    server.on('POST /invite-links/abc/accept', { status: 204 });
    await apiClient.acceptInviteLink('abc');
    expect(server.received('POST /invite-links/abc/accept')).toHaveLength(1);

    server.on('POST /invite-links/abc/accept', refusal(status, code));
    expect(await refusalOf(apiClient.acceptInviteLink('abc'))).toEqual([status, code]);
  });
});
