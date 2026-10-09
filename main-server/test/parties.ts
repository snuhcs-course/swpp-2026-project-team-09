/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-05  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { TestUser } from './friends.js';
import { joinQuest, ownQuest } from './quests.js';
import { withAccessToken } from './sign-in.js';

type SignedIn = Pick<TestUser, 'accessToken'>;

export function openParty(app: INestApplication<Server>, user: SignedIn, body: object = {}): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/parties'), user.accessToken).send({
    title: '같이 가요',
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

export function endParty(app: INestApplication<Server>, leader: SignedIn): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/parties/mine/end'), leader.accessToken);
}

export function setPartySharing(app: INestApplication<Server>, user: SignedIn, on: boolean): request.Test {
  return withAccessToken(request(app.getHttpServer()).put('/parties/mine/sharing'), user.accessToken).send({ on });
}

export function listParties(app: INestApplication<Server>, user: SignedIn): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/parties'), user.accessToken);
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

// Opens a Party and answers its id.
export async function partyOf(app: INestApplication<Server>, user: SignedIn, body: object = {}): Promise<string> {
  const response = await openParty(app, user, body);
  if (response.status !== 201) {
    throw new Error(`Opening a Party answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return z.object({ id: z.string() }).parse(response.body).id;
}

// Enters the Party, or throws.
export async function enter(app: INestApplication<Server>, user: SignedIn, partyId: string): Promise<void> {
  const response = await joinParty(app, user, partyId);
  if (response.status !== 201) {
    throw new Error(`Entering a Party answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
}

// Runs the step for each User, one after another, so that they enter in the order given.
function inTurn(users: readonly TestUser[], step: (user: TestUser) => Promise<void>): Promise<void> {
  return users.reduce(async (previous, user) => {
    await previous;
    await step(user);
  }, Promise.resolve());
}

// A Quest of the Leader's own that the others join, in the order given, so that they all hold it.
export async function sharedQuest(
  app: INestApplication<Server>,
  leader: TestUser,
  others: readonly TestUser[],
): Promise<string> {
  const questId = await ownQuest(app, leader, { joinPolicy: 'open', capacity: 8 });
  await inTurn(others, async (other) => {
    const response = await joinQuest(app, other, questId);
    if (response.status !== 201) {
      throw new Error(`Joining a Quest answered ${response.status}: ${JSON.stringify(response.body)}`);
    }
  });
  return questId;
}

// The Party of a Quest the Leader and the others hold, which the others enter in the order given. None of them are
// Friends.
export async function partyOfHolders(
  app: INestApplication<Server>,
  leader: TestUser,
  others: readonly TestUser[],
  body: object = {},
): Promise<{ partyId: string; questId: string }> {
  const questId = await sharedQuest(app, leader, others);
  const partyId = await partyOf(app, leader, { questId, ...body });
  await inTurn(others, (other) => enter(app, other, partyId));
  return { partyId, questId };
}

// The ids of the Parties in the User's list, in its order.
export async function listedIds(app: INestApplication<Server>, user: SignedIn): Promise<string[]> {
  const response = await listParties(app, user);
  return z
    .array(z.object({ id: z.string() }))
    .parse(response.body)
    .map(({ id }) => id);
}
