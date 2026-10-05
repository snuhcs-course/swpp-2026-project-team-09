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

export function setPartySharing(app: INestApplication<Server>, user: SignedIn, on: boolean): request.Test {
  return withAccessToken(request(app.getHttpServer()).put('/parties/mine/sharing'), user.accessToken).send({ on });
}

export function listParties(app: INestApplication<Server>, user: SignedIn): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/parties'), user.accessToken);
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
