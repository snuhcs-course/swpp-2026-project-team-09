import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { befriend, signInUser, TestUser } from './friends.js';
import {
  answerInvitation,
  enter,
  getInvitations,
  getJoinRequests,
  getSentJoinRequests,
  invitationOf,
  joinRequestOf,
  leaveParty,
  partyOf,
  withdrawJoinRequest,
} from './parties.js';
import { connectToDatabase, questFor, storeEvent } from './quests.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  prisma = connectToDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

interface Waiting {
  user: TestUser;
  asked: TestUser;
  inviting: TestUser;
  requestId: string;
  invitationId: string;
}

// A User with a request to join one Party and an invitation into another.
async function waiting(): Promise<Waiting> {
  const [user, asked, inviting] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
  await befriend(app, inviting, user);
  const askedPartyId = await partyOf(app, asked, { joinPolicy: 'approval' });
  await partyOf(app, inviting, { joinPolicy: 'closed' });
  return {
    user,
    asked,
    inviting,
    requestId: await joinRequestOf(app, user, askedPartyId),
    invitationId: await invitationOf(app, inviting, user),
  };
}

async function expectNoneWaiting({ user, asked }: Waiting): Promise<void> {
  expect((await getSentJoinRequests(app, user)).body).toEqual([]);
  expect((await getInvitations(app, user)).body).toEqual([]);
  expect((await getJoinRequests(app, asked)).body).toEqual([]);
}

describe('A request to join and an invitation', () => {
  it('wait until they are answered', async () => {
    const { user, asked } = await waiting();

    expect((await getSentJoinRequests(app, user)).body).toHaveLength(1);
    expect((await getInvitations(app, user)).body).toHaveLength(1);
    expect((await getJoinRequests(app, asked)).body).toHaveLength(1);
  });

  it('end when their Party ends', async () => {
    const { user, asked, inviting, requestId } = await waiting();

    await Promise.all([leaveParty(app, asked), leaveParty(app, inviting)]);

    expect((await getSentJoinRequests(app, user)).body).toEqual([]);
    expect((await getInvitations(app, user)).body).toEqual([]);
    expect((await withdrawJoinRequest(app, user, requestId)).status).toBe(404);
  });
});

describe('A User entering any Party', () => {
  it('by joining an Open Party ends the User’s requests to join and invitations', async () => {
    const found = await waiting();
    const leader = await signInUser(app);

    await enter(app, found.user, await partyOf(app, leader));

    await expectNoneWaiting(found);
  });

  it('by creating a Party ends them', async () => {
    const found = await waiting();

    await partyOf(app, found.user);

    await expectNoneWaiting(found);
  });

  it('by accepting an invitation ends the others', async () => {
    const found = await waiting();

    expect((await answerInvitation(app, found.user, found.invitationId, 'accept')).status).toBe(201);

    await expectNoneWaiting(found);
  });

  it('as a Holder of the mark ends them', async () => {
    const found = await waiting();
    const leader = await signInUser(app);
    const event = await storeEvent(prisma);
    const { questId } = await questFor(app, leader, event.id);
    const partyId = await partyOf(app, leader, { questId, joinPolicy: 'closed' });
    await prisma.questHolder.create({ data: { questId, userId: found.user.id, globalEventId: event.id } });

    await enter(app, found.user, partyId);

    await expectNoneWaiting(found);
  });
});
