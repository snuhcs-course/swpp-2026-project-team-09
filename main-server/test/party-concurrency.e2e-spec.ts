import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { befriend, signInUser } from './friends.js';
import { overlapOnLock } from './overlap.js';
import {
  answerInvitation,
  answerJoinRequest,
  createParty,
  getMyParty,
  invitationOf,
  joinParty,
  joinRequestOf,
  partyOf,
} from './parties.js';
import { connectToDatabase, questFor, storeEvent } from './quests.js';
import { refused } from './signals.js';
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

describe('Two Users joining the last free place at the same moment', () => {
  it('leave one of them in the Party', async () => {
    const [leader, first, second] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const partyId = await partyOf(app, leader, { capacity: 2 });

    const answers = await overlapOnLock(
      prisma,
      (tx) => tx.$queryRaw`SELECT 1 FROM parties WHERE id = ${partyId}::uuid FOR UPDATE`,
      () => joinParty(app, first, partyId),
      () => joinParty(app, second, partyId),
    );

    expect(answers.map(({ status }) => status)).toEqual([201, 409]);
    expect(answers[1].body).toMatchObject(refused(409, 'PARTY_FULL'));
    expect(await prisma.partyMember.count({ where: { partyId } })).toBe(2);
  });
});

describe('A request and an invitation accepted for the last free place at the same moment', () => {
  it('leave one of their Users in the Party', async () => {
    const [leader, asking, invited] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    await befriend(app, leader, invited);
    const partyId = await partyOf(app, leader, { capacity: 2, joinPolicy: 'approval' });
    const requestId = await joinRequestOf(app, asking, partyId);
    const invitationId = await invitationOf(app, leader, invited);

    const answers = await overlapOnLock(
      prisma,
      (tx) => tx.$queryRaw`SELECT 1 FROM parties WHERE id = ${partyId}::uuid FOR UPDATE`,
      () => answerJoinRequest(app, leader, requestId, 'accept'),
      () => answerInvitation(app, invited, invitationId, 'accept'),
    );

    expect(answers.map(({ status }) => status)).toEqual([204, 409]);
    expect(answers[1].body).toMatchObject(refused(409, 'PARTY_FULL'));
    expect((await getMyParty(app, leader)).body).toMatchObject({ members: [{ id: leader.id }, { id: asking.id }] });
  });
});

describe('Two Holders creating a Party for the same Quest at the same moment', () => {
  it('leave one running Party for it, which the later is led to', async () => {
    const [first, second] = await Promise.all([signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const { questId } = await questFor(app, first, event.id);
    await prisma.questHolder.create({ data: { questId, userId: second.id, globalEventId: event.id } });

    const answers = await overlapOnLock(
      prisma,
      (tx) => tx.$queryRaw`SELECT 1 FROM quests WHERE id = ${questId}::uuid FOR UPDATE`,
      () => createParty(app, first, { questId }),
      () => createParty(app, second, { questId }),
    );

    expect(answers.map(({ status }) => status)).toEqual([201, 409]);
    const [created] = await prisma.party.findMany({ where: { questId } });
    expect(answers[1].body).toMatchObject({ ...refused(409, 'PARTY_EXISTS_FOR_QUEST'), partyId: created?.id });
    expect((await getMyParty(app, second)).status).toBe(404);
  });
});

describe('One User joining two Parties at the same moment', () => {
  it('leaves the User in one of them', async () => {
    const [user, oneLeader, otherLeader] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const [one, other] = await Promise.all([partyOf(app, oneLeader), partyOf(app, otherLeader)]);

    const answers = await overlapOnLock(
      prisma,
      (tx) => tx.$queryRaw`SELECT 1 FROM users WHERE id = ${user.id}::uuid FOR UPDATE`,
      () => joinParty(app, user, one),
      () => joinParty(app, user, other),
    );

    expect(answers.map(({ status }) => status)).toEqual([201, 409]);
    expect(answers[1].body).toMatchObject(refused(409, 'ALREADY_IN_PARTY'));
    expect((await getMyParty(app, user)).body).toMatchObject({ id: one });
    expect(await prisma.partyMember.count({ where: { userId: user.id } })).toBe(1);
  });
});

describe('The database', () => {
  it('keeps a User in one Party', async () => {
    const [user, leader] = await Promise.all([signInUser(app), signInUser(app)]);
    await partyOf(app, user);
    const partyId = await partyOf(app, leader);

    await expect(prisma.partyMember.create({ data: { partyId, userId: user.id } })).rejects.toMatchObject({
      code: 'P2002',
    });
  });

  it('lets one running Party carry a Quest', async () => {
    const leader = await signInUser(app);
    const { questId } = await questFor(app, leader, (await storeEvent(prisma)).id);
    await partyOf(app, leader, { questId });

    await expect(
      prisma.party.create({ data: { title: '둘째', capacity: 4, joinPolicy: 'open', leaderId: leader.id, questId } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});
