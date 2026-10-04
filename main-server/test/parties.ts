import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { TestUser } from './friends.js';
import { withAccessToken } from './sign-in.js';

type SignedIn = Pick<TestUser, 'accessToken'>;

export function createParty(app: INestApplication<Server>, user: SignedIn, body: object = {}): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/parties'), user.accessToken).send({
    title: '같이 가요',
    joinPolicy: 'open',
    ...body,
  });
}

export function joinParty(app: INestApplication<Server>, user: SignedIn, partyId: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).post(`/parties/${partyId}/join`), user.accessToken);
}

export function getMyParty(app: INestApplication<Server>, user: SignedIn): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/parties/mine'), user.accessToken);
}

export function leaveParty(app: INestApplication<Server>, user: SignedIn): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/parties/mine/leave'), user.accessToken);
}

export function setPartySharing(app: INestApplication<Server>, user: SignedIn, on: boolean): request.Test {
  return withAccessToken(request(app.getHttpServer()).put('/parties/mine/sharing'), user.accessToken).send({ on });
}

export function listParties(app: INestApplication<Server>, user: SignedIn, globalEventId?: string): request.Test {
  const call = withAccessToken(request(app.getHttpServer()).get('/parties'), user.accessToken);
  return globalEventId === undefined ? call : call.query({ globalEventId });
}

export function askToJoin(app: INestApplication<Server>, user: SignedIn, partyId: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/party-join-requests'), user.accessToken).send({ partyId });
}

export function getSentJoinRequests(app: INestApplication<Server>, user: SignedIn): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/party-join-requests'), user.accessToken);
}

export function withdrawJoinRequest(app: INestApplication<Server>, user: SignedIn, requestId: string): request.Test {
  return withAccessToken(
    request(app.getHttpServer()).post(`/party-join-requests/${requestId}/withdraw`),
    user.accessToken,
  );
}

export function getJoinRequests(app: INestApplication<Server>, leader: SignedIn): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/parties/mine/join-requests'), leader.accessToken);
}

export function answerJoinRequest(
  app: INestApplication<Server>,
  leader: SignedIn,
  requestId: string,
  answer: 'accept' | 'decline',
): request.Test {
  return withAccessToken(
    request(app.getHttpServer()).post(`/parties/mine/join-requests/${requestId}/${answer}`),
    leader.accessToken,
  );
}

export function invite(app: INestApplication<Server>, leader: SignedIn, userId: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/parties/mine/invitations'), leader.accessToken).send({
    userId,
  });
}

export function getInvitations(app: INestApplication<Server>, user: SignedIn): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/party-invitations'), user.accessToken);
}

export function answerInvitation(
  app: INestApplication<Server>,
  user: SignedIn,
  invitationId: string,
  answer: 'accept' | 'decline',
): request.Test {
  return withAccessToken(
    request(app.getHttpServer()).post(`/party-invitations/${invitationId}/${answer}`),
    user.accessToken,
  );
}

export function changeParty(app: INestApplication<Server>, leader: SignedIn, changes: object): request.Test {
  return withAccessToken(request(app.getHttpServer()).patch('/parties/mine'), leader.accessToken).send(changes);
}

export function handOver(app: INestApplication<Server>, leader: SignedIn, userId: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).put('/parties/mine/leader'), leader.accessToken).send({
    userId,
  });
}

export function removeMember(app: INestApplication<Server>, leader: SignedIn, userId: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).delete(`/parties/mine/members/${userId}`), leader.accessToken);
}

// The User asks to join the Party, and the id of the request is answered.
export async function joinRequestOf(app: INestApplication<Server>, user: SignedIn, partyId: string): Promise<string> {
  const response = await askToJoin(app, user, partyId);
  if (response.status !== 201) {
    throw new Error(`Asking to join answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return z.object({ id: z.string() }).parse(response.body).id;
}

// The Leader invites the User, and the id of the invitation, as the User lists it, is answered.
export async function invitationOf(
  app: INestApplication<Server>,
  leader: SignedIn,
  user: SignedIn & { id: string },
): Promise<string> {
  const response = await invite(app, leader, user.id);
  if (response.status !== 204) {
    throw new Error(`Inviting answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  const [newest] = z.array(z.object({ id: z.string() })).parse((await getInvitations(app, user)).body);
  if (newest === undefined) {
    throw new Error('The invited User lists no invitation');
  }
  return newest.id;
}

// Creates a Party and answers its id.
export async function partyOf(app: INestApplication<Server>, user: SignedIn, body: object = {}): Promise<string> {
  const response = await createParty(app, user, body);
  if (response.status !== 201) {
    throw new Error(`Creating a Party answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return z.object({ id: z.string() }).parse(response.body).id;
}

// Joins the Party, or throws.
export async function enter(app: INestApplication<Server>, user: SignedIn, partyId: string): Promise<void> {
  const response = await joinParty(app, user, partyId);
  if (response.status !== 201) {
    throw new Error(`Joining a Party answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
}

// The ids of the Parties in a list, in its order.
export async function listedIds(
  app: INestApplication<Server>,
  user: SignedIn,
  globalEventId?: string,
): Promise<string[]> {
  const response = await listParties(app, user, globalEventId);
  return z
    .array(z.object({ id: z.string() }))
    .parse(response.body)
    .map(({ id }) => id);
}
