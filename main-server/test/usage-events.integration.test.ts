/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { postFriendship } from './admin-users.js';
import { ask, postAssistantMessages } from './assistant.js';
import { putConsent, putUsageConsent } from './consent.js';
import { connect } from './containers.js';
import {
  answerFriendRequest,
  befriend,
  requestFriendship,
  sendFriendRequest,
  signInUser,
  type TestUser,
} from './friends.js';
import { acceptInviteLink, createInviteLink } from './invite-links.js';
import { answerInvitation, answerJoinRequest, invitationOf, joinRequestOf } from './quest-recruiting.js';
import { attend, joinQuest, ownQuest, storeEvent } from './quests.js';
import { ScriptedModel } from './scripted-model.js';
import { signInAsAdministrator } from './sign-in.js';
import { startApp } from './start-app.js';
import { PostHogStub, POSTHOG_TOKEN, settle, usageSettings } from './usage.js';

// The main server's usage events through the started server, its database and a stand-in for PostHog's client: each
// closing stage once, for the right User, with its properties, after its work is stored; the flows that are not
// counted; and the account's consent read for each event.

const posthog = new PostHogStub();
const model = new ScriptedModel();
let app: INestApplication<Server>;
let prisma: PrismaClient;
const events: string[] = [];

beforeAll(async () => {
  const settings = { ...inject('settings'), ...usageSettings };
  app = await startApp(settings, [], undefined, model.model, [], undefined, undefined, {
    posthog: posthog.clients,
  });
  prisma = connect(settings.DATABASE_URL);
});

afterAll(async () => {
  await prisma.quest.deleteMany({ where: { globalEventId: { in: events } } });
  await prisma.globalEvent.deleteMany({ where: { id: { in: events } } });
  await prisma.$disconnect();
  await app.close();
});

beforeEach(() => {
  posthog.reset();
});

// A new User whose account agreed to the documents with usage data chosen.
async function chooser(): Promise<TestUser> {
  const user = await signInUser(app);
  await putConsent(app, user.accessToken, { version: 1, usage: true }).expect(204);
  return user;
}

// Waits for the User's events to reach the stand-in, then for any other that was wrongly started.
async function sentFor(user: TestUser, count: number): Promise<object[]> {
  await vi.waitFor(() => {
    expect(posthog.of(user.id).length).toBeGreaterThanOrEqual(count);
  });
  await settle();
  return posthog.of(user.id);
}

const event = (name: string, properties: object = {}): object => ({
  event: name,
  properties: { ...properties, source: 'server' },
});

describe('With a token', () => {
  it('makes one client with the token', () => {
    expect(posthog.tokens).toEqual([POSTHOG_TOKEN]);
  });
});

describe('party_creation_completed', () => {
  it('a 파티 made by the form sends its visibility: private for a Closed Quest, public for an Open one', async () => {
    const user = await chooser();

    await ownQuest(app, user);
    await ownQuest(app, user, { joinPolicy: 'open' });

    const sent = await sentFor(user, 2);
    expect(sent).toEqual([
      { distinctId: user.id, ...event('party_creation_completed', { visibility: 'private' }) },
      { distinctId: user.id, ...event('party_creation_completed', { visibility: 'public' }) },
    ]);
  });

  it("a Global Event's new Quest sends one, and attending it again, which finds the User's Quest, sends nothing", async () => {
    const user = await chooser();
    const globalEvent = await storeEvent(prisma);
    events.push(globalEvent.id);

    await attend(app, user, globalEvent.id).expect(201);
    await attend(app, user, globalEvent.id).expect(201);

    expect(await sentFor(user, 1)).toEqual([
      { distinctId: user.id, ...event('party_creation_completed', { visibility: 'private' }) },
    ]);
  });
});

describe('party_join_completed', () => {
  it('a join of an Open Quest sends joined_directly for the User who joined', async () => {
    const leader = await chooser();
    const user = await chooser();
    const questId = await ownQuest(app, leader, { joinPolicy: 'open' });

    await joinQuest(app, user, questId).expect(201);

    expect(await sentFor(user, 1)).toEqual([
      { distinctId: user.id, ...event('party_join_completed', { how: 'joined_directly' }) },
    ]);
    expect(posthog.of(leader.id)).toEqual([
      { distinctId: leader.id, ...event('party_creation_completed', { visibility: 'public' }) },
    ]);
  });

  it('an accepted invitation sends invitation_accepted for the invited User', async () => {
    const leader = await chooser();
    const user = await chooser();
    await befriend(app, leader, user);
    const questId = await ownQuest(app, leader);
    const invitationId = await invitationOf(app, leader, questId, user);
    await sentFor(user, 1);
    posthog.reset();

    await answerInvitation(app, user, invitationId, 'accept').expect(201);

    expect(await sentFor(user, 1)).toEqual([
      { distinctId: user.id, ...event('party_join_completed', { how: 'invitation_accepted' }) },
    ]);
    expect(posthog.of(leader.id)).toEqual([]);
  });

  it("the Leader's accepting a join request sends request_accepted for the User who asked, and nothing for the Leader", async () => {
    const leader = await chooser();
    const user = await chooser();
    const questId = await ownQuest(app, leader, { joinPolicy: 'approval' });
    const requestId = await joinRequestOf(app, user, questId);
    await sentFor(leader, 1);
    posthog.reset();

    await answerJoinRequest(app, leader, { questId, requestId }, 'accept').expect(204);

    expect(await sentFor(user, 1)).toEqual([
      { distinctId: user.id, ...event('party_join_completed', { how: 'request_accepted' }) },
    ]);
    expect(posthog.of(leader.id)).toEqual([]);
  });
});

describe('friendship_creation_completed', () => {
  it('an accepted Friend Request sends request_accepted once for each of the two Users', async () => {
    const sender = await chooser();
    const receiver = await chooser();
    const requestId = await requestFriendship(app, sender, receiver);

    await answerFriendRequest(app, receiver, requestId, 'accept').expect(204);

    const how = { how: 'request_accepted' };
    expect(await sentFor(sender, 1)).toEqual([
      { distinctId: sender.id, ...event('friendship_creation_completed', how) },
    ]);
    expect(posthog.of(receiver.id)).toEqual([
      { distinctId: receiver.id, ...event('friendship_creation_completed', how) },
    ]);
  });

  it('crossed Friend Requests send requests_crossed once for each, and the first request nothing', async () => {
    const first = await chooser();
    const second = await chooser();
    await sendFriendRequest(app, first, second.friendId).expect(201);

    await sendFriendRequest(app, second, first.friendId).expect(201);

    const how = { how: 'requests_crossed' };
    expect(await sentFor(first, 1)).toEqual([{ distinctId: first.id, ...event('friendship_creation_completed', how) }]);
    expect(posthog.of(second.id)).toEqual([{ distinctId: second.id, ...event('friendship_creation_completed', how) }]);
  });
});

describe('friendship_creation_completed of an Invite Link, and none of the admin site', () => {
  it('an accepted Invite Link sends invite_link_accepted once for each of the two Users', async () => {
    const sender = await chooser();
    const receiver = await chooser();
    const token = await createInviteLink(app, sender);

    await acceptInviteLink(app, receiver, token).expect(204);

    const how = { how: 'invite_link_accepted' };
    expect(await sentFor(sender, 1)).toEqual([
      { distinctId: sender.id, ...event('friendship_creation_completed', how) },
    ]);
    expect(posthog.of(receiver.id)).toEqual([
      { distinctId: receiver.id, ...event('friendship_creation_completed', how) },
    ]);
  });

  it("the admin site's befriending sends nothing", async () => {
    const one = await chooser();
    const other = await chooser();
    const { accessToken } = await signInAsAdministrator(app);

    await postFriendship(app, accessToken, one.id, other.id).expect(204);

    await settle();
    expect(posthog.events).toEqual([]);
  });
});

describe('assistant_reply_completed', () => {
  it('a reply answered 200 sends one, with no property but the source', async () => {
    const user = await chooser();
    model.script({ text: '안녕하세요.' });

    await postAssistantMessages(app, user.accessToken, ask('안녕')).expect(200);

    expect(await sentFor(user, 1)).toEqual([{ distinctId: user.id, ...event('assistant_reply_completed') }]);
  });

  it('a reply the Assistant could not give (503) sends nothing', async () => {
    const user = await chooser();
    model.script({ error: new Error('The provider failed') });

    await postAssistantMessages(app, user.accessToken, ask('안녕')).expect(503);

    await settle();
    expect(posthog.events).toEqual([]);
  });
});

describe("The account's consent", () => {
  it('a User whose account agreed to no version sends nothing', async () => {
    const user = await signInUser(app);

    await ownQuest(app, user);

    await settle();
    expect(posthog.events).toEqual([]);
  });

  it('a User who chose no sends nothing', async () => {
    const user = await signInUser(app);
    await putConsent(app, user.accessToken, { version: 1, usage: false }).expect(204);

    await ownQuest(app, user);

    await settle();
    expect(posthog.events).toEqual([]);
  });

  it('the switch turned off sends nothing from the next event, and turned on again sends again', async () => {
    const user = await chooser();
    await ownQuest(app, user);
    await sentFor(user, 1);

    await putUsageConsent(app, user.accessToken, { usage: false }).expect(204);
    await ownQuest(app, user);
    await settle();
    expect(posthog.of(user.id)).toHaveLength(1);

    await putUsageConsent(app, user.accessToken, { usage: true }).expect(204);
    await ownQuest(app, user, { joinPolicy: 'open' });
    expect(await sentFor(user, 2)).toEqual([
      { distinctId: user.id, ...event('party_creation_completed', { visibility: 'private' }) },
      { distinctId: user.id, ...event('party_creation_completed', { visibility: 'public' }) },
    ]);
  });
});
