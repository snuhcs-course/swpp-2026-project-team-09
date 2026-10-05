import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { signInUser, TestUser } from './friends.js';
import { getMatchingRequest, getMatchingRequests, MatchServerStub, withdrawMatching } from './match-server.js';
import { refused } from './signals.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

let app: INestApplication<Server>;
let user: TestUser;
const matchServer = new MatchServerStub();
const globalEventId = randomUUID();

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, matchServer.fetch);
  user = await signInUser(app);
});

beforeEach(() => {
  matchServer.calls = [];
});

afterAll(async () => {
  await app.close();
});

function requestIn(state: string): object {
  return { globalEventId, size: 3, state, arrivedAt: '2026-10-04T08:00:00.000Z', questId: null };
}

describe('Withdrawing a request', () => {
  it('is passed on to the match server', async () => {
    const path = `/users/${user.id}/matching-requests/${globalEventId}/withdraw`;
    matchServer.answers('POST', path, 204);

    const response = await withdrawMatching(app, user, globalEventId);

    expect(response.status).toBe(204);
    expect(matchServer.calls).toEqual([
      {
        method: 'POST',
        path,
        body: null,
        authorization: `Bearer ${inject('settings').MATCH_SERVER_TOKEN}`,
      },
    ]);
  });

  it.each([
    [409, 'MATCHING_REQUEST_NOT_WAITING'],
    [404, 'MATCHING_REQUEST_NOT_FOUND'],
  ] as const)('is refused with %s %s as the match server refuses it', async (status, code) => {
    matchServer.refuses('POST', `/users/${user.id}/matching-requests/${globalEventId}/withdraw`, status, code);

    const response = await withdrawMatching(app, user, globalEventId);

    expect(response.status).toBe(status);
    expect(response.body).toMatchObject(refused(status, code));
  });
});

describe('The state of a request', () => {
  it.each(['waiting', 'matched', 'withdrawn', 'expired'])('reads %s', async (state) => {
    matchServer.answers('GET', `/users/${user.id}/matching-requests/${globalEventId}`, 200, requestIn(state));

    const response = await getMatchingRequest(app, user, globalEventId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(requestIn(state));
  });

  it('names the Quest of a matched request', async () => {
    const matched = { ...requestIn('matched'), questId: randomUUID() };
    matchServer.answers('GET', `/users/${user.id}/matching-requests/${globalEventId}`, 200, matched);

    const response = await getMatchingRequest(app, user, globalEventId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(matched);
  });

  it('is none when the User has not asked', async () => {
    matchServer.refuses(
      'GET',
      `/users/${user.id}/matching-requests/${globalEventId}`,
      404,
      'MATCHING_REQUEST_NOT_FOUND',
    );

    const response = await getMatchingRequest(app, user, globalEventId);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'MATCHING_REQUEST_NOT_FOUND'));
  });
});

describe("A User's open requests", () => {
  it('are read from the match server', async () => {
    matchServer.answers('GET', `/users/${user.id}/matching-requests`, 200, [requestIn('waiting')]);

    const response = await getMatchingRequests(app, user);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([requestIn('waiting')]);
  });
});
