import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { befriend, signInUser } from './friends.js';
import {
  getInvitations,
  getMyParty,
  getSentJoinRequests,
  handOver,
  invitationOf,
  joinRequestOf,
  leaveParty,
  listedIds,
  listParties,
  partyOf,
  partyOfHolders,
  sharedQuest,
} from './parties.js';
import { connectToDatabase, joinQuest, questFor, storeEvent } from './quests.js';
import { ANY_STRING } from './signals.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  prisma = connectToDatabase();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

describe('The list of Parties a User can see', () => {
  it('has a Party a Friend is in, with the Friends in it, and no position', async () => {
    const [reader, leader, friend] = await Promise.all([
      signInUser(app),
      signInUser(app, { name: '홍길동', department: '컴퓨터공학부' }),
      signInUser(app, { name: '김철수', department: '경영학과' }),
    ]);
    await befriend(app, reader, friend);
    const { partyId } = await partyOfHolders(app, leader, [friend], { title: '설명회 같이', capacity: 3 });

    const response = await listParties(app, reader);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: partyId,
        title: '설명회 같이',
        memberCount: 2,
        capacity: 3,
        joinPolicy: 'closed',
        quest: { id: ANY_STRING, title: '저녁 같이 먹어요', globalEvent: null },
        leader: { id: leader.id, name: '홍길동' },
        holdsQuest: false,
        friends: [{ id: friend.id, name: '김철수', department: '경영학과' }],
      },
    ]);
  });
});

describe('Who leads a Party', () => {
  it('is in the list, in a request to enter and in an invitation, also once the role was handed over', async () => {
    const [reader, leader, member] = await Promise.all([
      signInUser(app),
      signInUser(app),
      signInUser(app, { name: '김철수', department: '경영학과' }),
    ]);
    await befriend(app, reader, leader);
    await befriend(app, reader, member);
    const { partyId } = await partyOfHolders(app, leader, [member], { joinPolicy: 'approval' });
    await joinRequestOf(app, reader, partyId);
    await handOver(app, leader, member.id);
    await invitationOf(app, member, reader);

    const leaderNow = { id: member.id, name: '김철수' };
    expect((await listParties(app, reader)).body).toMatchObject([{ id: partyId, leader: leaderNow }]);
    expect((await getSentJoinRequests(app, reader)).body).toMatchObject([
      { party: { id: partyId, leader: leaderNow } },
    ]);
    const [invitation] = z.array(z.unknown()).parse((await getInvitations(app, reader)).body);
    expect(invitation).toMatchObject({ party: { id: partyId, leader: leaderNow } });
    expect(invitation).not.toHaveProperty('party.leader.department');
  });
});

describe('The list of Parties a User can see, for a Holder', () => {
  it('has the running Party of a Quest the User holds, without having entered it', async () => {
    const [reader, leader] = await Promise.all([signInUser(app), signInUser(app)]);
    const { id: globalEventId } = await storeEvent(prisma);
    const { questId } = await questFor(app, leader, globalEventId);
    // As the Leader sets it in ticket 14.
    await prisma.quest.update({ where: { id: questId }, data: { joinPolicy: 'open', board: 'hobby' } });
    expect((await joinQuest(app, reader, questId)).status).toBe(201);
    const partyId = await partyOf(app, leader, { questId, joinPolicy: 'approval' });

    expect((await listParties(app, reader)).body).toEqual([
      expect.objectContaining({
        id: partyId,
        joinPolicy: 'approval',
        quest: {
          id: questId,
          title: '지능형통신 연합전공 설명회',
          globalEvent: { id: globalEventId, title: '지능형통신 연합전공 설명회' },
        },
        holdsQuest: true,
        friends: [],
      }),
    ]);
  });

  it('has the Parties of Friends under every Join Policy, the newest first', async () => {
    const [reader, open, approval, closed] = await Promise.all(Array.from({ length: 4 }, () => signInUser(app)));
    await befriend(app, reader, open);
    await befriend(app, reader, approval);
    await befriend(app, reader, closed);
    const openId = await partyOf(app, open, { joinPolicy: 'open' });
    const approvalId = await partyOf(app, approval, { joinPolicy: 'approval' });
    const closedId = await partyOf(app, closed, { joinPolicy: 'closed' });

    expect(await listedIds(app, reader)).toEqual([closedId, approvalId, openId]);
  });

  it('has a Party once, when the User holds its Quest and a Friend is in it', async () => {
    const [reader, leader] = await Promise.all([signInUser(app), signInUser(app)]);
    await befriend(app, reader, leader);
    const questId = await sharedQuest(app, leader, [reader]);
    const partyId = await partyOf(app, leader, { questId });

    expect((await listParties(app, reader)).body).toEqual([
      expect.objectContaining({ id: partyId, holdsQuest: true, friends: [expect.objectContaining({ id: leader.id })] }),
    ]);
  });
});

describe('What the list of Parties a User can see leaves out', () => {
  it('leaves out the User’s own Party and the Parties of Users who are neither Friends nor Holders', async () => {
    const [reader, friend, stranger] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    await befriend(app, reader, friend);
    const { partyId } = await partyOfHolders(app, reader, [friend]);
    await partyOf(app, stranger, { joinPolicy: 'open' });

    expect(await listedIds(app, reader)).toEqual([]);
    expect(await listedIds(app, friend)).toEqual([]);
    expect((await getMyParty(app, friend)).body).toMatchObject({ id: partyId });
  });

  it('leaves out a Party once its last Friend left it', async () => {
    const [reader, friend, other] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    await befriend(app, reader, friend);
    const { partyId } = await partyOfHolders(app, other, [friend]);
    expect(await listedIds(app, reader)).toEqual([partyId]);

    await leaveParty(app, friend);

    expect(await listedIds(app, reader)).toEqual([]);
  });

  it('keeps a Party whose Quest has no Sub Quest ahead', async () => {
    const [reader, friend] = await Promise.all([signInUser(app), signInUser(app)]);
    await befriend(app, reader, friend);
    const event = await storeEvent(prisma);
    const { questId } = await questFor(app, friend, event.id);
    const partyId = await partyOf(app, friend, { questId });

    const endsAt = event.endsAt ?? new Date();
    vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(new Date(endsAt.getTime() + 1));

    expect(await listedIds(app, reader)).toEqual([partyId]);
  });
});
