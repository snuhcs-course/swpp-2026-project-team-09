import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { JoinPolicy, PrismaClient } from '../src/generated/prisma/client.js';
import { signInUser, TestUser } from './friends.js';
import {
  connectToDatabase,
  getRecruitingQuests,
  markDone,
  ownQuest,
  place132,
  questFor,
  storeEvent,
  subQuestIn,
} from './quests.js';
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

const HOUR = 60 * 60 * 1000;

const entriesSchema = z.array(z.object({ id: z.string() }).loose());

// The entries of the list among these Quests, in the list's order. Other tests add Quests to the same list.
async function recruitingAmong(
  reader: TestUser,
  questIds: readonly string[],
  globalEventId?: string,
): Promise<unknown[]> {
  const response = await getRecruitingQuests(app, reader, globalEventId);
  expect(response.status).toBe(200);
  return entriesSchema.parse(response.body).filter(({ id }) => questIds.includes(id));
}

// The User's Quest for the Global Event, under the Join Policy given, as the Leader sets it in ticket 14.
async function attendedQuest(user: TestUser, globalEventId: string, joinPolicy: JoinPolicy): Promise<string> {
  const { questId } = await questFor(app, user, globalEventId);
  await prisma.quest.update({
    where: { id: questId },
    data: { joinPolicy, board: joinPolicy === 'closed' ? null : 'hobby' },
  });
  return questId;
}

describe('The list of recruiting Quests', () => {
  it('has the Open and Approval Quests of others, the newest first, with what a reader decides by', async () => {
    const [leader, other, reader] = await Promise.all([
      signInUser(app, { name: '김철수', department: '경영학과' }),
      signInUser(app),
      signInUser(app),
    ]);
    const open = await ownQuest(app, other, { joinPolicy: 'open' });
    const startsAt = new Date(Date.now() + 5 * HOUR).toISOString();
    const subQuest = { title: '저녁', startsAt, endsAt: null, place: { label: '자하연 앞', ...place132 } };
    const approval = await ownQuest(app, leader, {
      title: '저녁 모임',
      subQuest,
      capacity: 3,
      joinPolicy: 'approval',
      board: 'meal',
      description: '학관에서 저녁',
    });

    const entries = await recruitingAmong(reader, [open, approval]);

    expect(entries).toMatchObject([{ id: approval }, { id: open }]);
    expect(entries[0]).toEqual({
      id: approval,
      title: '저녁 모임',
      globalEvent: null,
      leader: { id: leader.id, name: '김철수', department: '경영학과' },
      holderCount: 1,
      capacity: 3,
      joinPolicy: 'approval',
      board: 'meal',
      description: '학관에서 저녁',
      createdAt: expect.any(String) as unknown,
      nextSubQuest: {
        id: expect.any(String) as unknown,
        attending: false,
        ...subQuest,
        place: { placeId: null, ...subQuest.place },
      },
    });
  });
});

describe('What the list of recruiting Quests leaves out and shows', () => {
  it('leaves out a Closed Quest and the Quests the reader holds', async () => {
    const [user, reader] = await Promise.all([signInUser(app), signInUser(app)]);
    const closed = await ownQuest(app, user);
    const held = await ownQuest(app, reader, { joinPolicy: 'open' });

    expect(await recruitingAmong(reader, [closed, held])).toEqual([]);
  });

  it('leaves out a Quest whose Sub Quests have all passed, and keeps one a Holder marked done', async () => {
    const [user, reader] = await Promise.all([signInUser(app), signInUser(app)]);
    const ended = new Date(Date.now() - HOUR).toISOString();
    const passed = await ownQuest(app, user, { joinPolicy: 'open', subQuest: { title: '점심', endsAt: ended } });
    const done = await ownQuest(app, user, { joinPolicy: 'open', subQuest: { title: '산책' } });
    const [only] = await prisma.subQuest.findMany({ where: { questId: done } });
    await markDone(app, user, { questId: done, subQuestId: only?.id ?? '' });

    expect(await recruitingAmong(reader, [passed, done])).toMatchObject([{ id: done }]);
  });

  it('shows the first Sub Quest ahead', async () => {
    const [user, reader] = await Promise.all([signInUser(app), signInUser(app)]);
    const ended = new Date(Date.now() - HOUR).toISOString();
    const questId = await ownQuest(app, user, { joinPolicy: 'open', subQuest: { title: '점심', endsAt: ended } });
    const ahead = await subQuestIn(app, user, questId, { title: '카페' });

    expect(await recruitingAmong(reader, [questId])).toMatchObject([{ nextSubQuest: { id: ahead, title: '카페' } }]);
  });
});

describe('The list of recruiting Quests for one Global Event', () => {
  it('has only the Quests for it, each with the event and its attending Sub Quest', async () => {
    const [first, second, third, reader] = await Promise.all([1, 2, 3, 4].map(() => signInUser(app)));
    const event = await storeEvent(prisma);
    const open = await attendedQuest(first, event.id, 'open');
    const approval = await attendedQuest(second, event.id, 'approval');
    await attendedQuest(third, event.id, 'closed');
    await ownQuest(app, third, { joinPolicy: 'open' });

    const response = await getRecruitingQuests(app, reader, event.id);

    const globalEvent = { id: event.id, title: event.title };
    expect(response.body).toMatchObject([
      { id: approval, globalEvent, joinPolicy: 'approval' },
      {
        id: open,
        globalEvent,
        joinPolicy: 'open',
        nextSubQuest: { attending: true, startsAt: event.startsAt?.toISOString() },
      },
    ]);
  });

  it('leaves out a Quest whose Global Event was cancelled', async () => {
    const [user, reader] = await Promise.all([signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma, { endsAt: null });
    await attendedQuest(user, event.id, 'open');
    await prisma.globalEvent.update({ where: { id: event.id }, data: { state: 'cancelled' } });

    expect((await getRecruitingQuests(app, reader, event.id)).body).toEqual([]);
  });
});
