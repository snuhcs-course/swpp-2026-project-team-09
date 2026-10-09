/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
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
  sharedQuest,
  withdrawJoinRequest,
} from './parties.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
});

afterAll(async () => {
  await app.close();
});

interface Waiting {
  user: TestUser;
  asked: TestUser;
  inviting: TestUser;
  requestId: string;
  invitationId: string;
}

// A User with a request to enter one Party and an invitation into another.
async function waiting(): Promise<Waiting> {
  const [user, asked, inviting] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
  await befriend(app, asked, user);
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

describe('A request to enter and an invitation', () => {
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
  it('by entering an Open Party ends the User’s requests to enter and invitations', async () => {
    const found = await waiting();
    const leader = await signInUser(app);
    await befriend(app, leader, found.user);

    await enter(app, found.user, await partyOf(app, leader, { joinPolicy: 'open' }));

    await expectNoneWaiting(found);
  });

  it('by opening a Party ends them', async () => {
    const found = await waiting();

    await partyOf(app, found.user);

    await expectNoneWaiting(found);
  });

  it('by accepting an invitation ends the others', async () => {
    const found = await waiting();

    expect((await answerInvitation(app, found.user, found.invitationId, 'accept')).status).toBe(201);

    await expectNoneWaiting(found);
  });

  it('as a Holder of the Party’s Quest ends them', async () => {
    const found = await waiting();
    const leader = await signInUser(app);
    const questId = await sharedQuest(app, leader, [found.user]);
    const partyId = await partyOf(app, leader, { questId, joinPolicy: 'closed' });

    await enter(app, found.user, partyId);

    await expectNoneWaiting(found);
  });
});
