/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { GlobalEvent, PrismaClient } from '../src/generated/prisma/client.js';
import { ask, postAssistantMessages } from './assistant.js';
import { signInUser, TestUser } from './friends.js';
import { refuseMatchServer } from './match-server.js';
import { askToJoin } from './quest-recruiting.js';
import { connectToDatabase, getRecruitingQuests, joinQuest, ownQuest, storeEvent, storeSharedQuest } from './quests.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// What the chat Assistant's searchRecruitingQuests leaves out whatever the window, with the scripted model in the model's
// place. The files share the database, so each test seeds what it reads in a month of 2094 of its own, which no other
// file uses, and always searches in that month.

let app: INestApplication<Server>;
let prisma: PrismaClient;
let leader: TestUser;
let reader: TestUser;
const model = new ScriptedModel();

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, refuseMatchServer, model.model);
  prisma = connectToDatabase();
  leader = await signInUser(app);
  reader = await signInUser(app);
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

function questAt(time: string, body: object = {}): Promise<string> {
  return ownQuest(app, leader, {
    joinPolicy: 'open',
    subQuest: { title: '모임', startsAt: new Date(`${time}+09:00`).toISOString() },
    ...body,
  });
}

function eventAt(time: string): Promise<GlobalEvent> {
  const startsAt = new Date(`${time}+09:00`);
  return storeEvent(prisma, { startsAt, endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000) });
}

async function questFor(event: GlobalEvent, leaderId: string = leader.id): Promise<string> {
  const quest = await prisma.quest.create({
    data: {
      title: '같이 가요',
      globalEventId: event.id,
      leaderId,
      joinPolicy: 'open',
      board: 'show',
      holders: { create: { userId: leaderId, globalEventId: event.id } },
      subQuests: { create: { attending: true } },
    },
  });
  return quest.id;
}

async function questsFound(input: object): Promise<string[]> {
  model.script({ tool: 'searchRecruitingQuests', input }, { text: '…' });
  await postAssistantMessages(app, reader.accessToken, ask('파티 있어?'));
  const [result] = z
    .array(z.object({ quests: z.array(z.object({ id: z.string() })).default([]) }))
    .parse(model.toolResults());
  return result?.quests.map(({ id }) => id) ?? [];
}

describe('searchRecruitingQuests, by what the reader can enter', () => {
  it('never gives a Full Quest, though the Boards list it', async () => {
    const full = await questAt('2094-01-05T18:00:00', { capacity: 1 });
    const room = await questAt('2094-01-05T19:00:00', { capacity: 2 });

    expect(await questsFound({ from: '2094-01-05', to: '2094-01-05' })).toEqual([room]);
    const listed = z.array(z.object({ id: z.string() }).loose()).parse((await getRecruitingQuests(app, reader)).body);
    expect(listed.map(({ id }) => id)).toEqual(expect.arrayContaining([full, room]));
  });

  it('never gives a Quest the reader already asked to join', async () => {
    const asked = await questAt('2094-02-05T18:00:00', { joinPolicy: 'approval' });
    const other = await questAt('2094-02-05T19:00:00', { joinPolicy: 'approval' });
    await askToJoin(app, reader, asked).expect(201);

    expect(await questsFound({ from: '2094-02-05', to: '2094-02-05' })).toEqual([other]);
  });

  it('never gives a Quest for an event of which the reader holds a Shared Quest, but does for one held alone', async () => {
    const shared = await eventAt('2094-03-05T18:00:00');
    const alone = await eventAt('2094-03-05T19:00:00');
    await storeSharedQuest(prisma, shared, [reader.id, leader.id]);
    await questFor(shared, (await signInUser(app)).id);
    await questFor(alone, reader.id);
    const forAlone = await questFor(alone);

    expect(await questsFound({ from: '2094-03-05', to: '2094-03-05' })).toEqual([forAlone]);
  });
});

describe('searchRecruitingQuests, by room', () => {
  it('gives those with at least minPlacesLeft places left, and with one by default', async () => {
    const one = await questAt('2094-04-05T18:00:00', { capacity: 2 });
    const two = await questAt('2094-04-05T19:00:00', { capacity: 3 });

    const day = { from: '2094-04-05', to: '2094-04-05' };
    expect(await questsFound(day)).toEqual([one, two]);
    expect(await questsFound({ ...day, minPlacesLeft: 2 })).toEqual([two]);
  });

  it('gives those of exactly that capacity, and says so when there is none', async () => {
    await questAt('2094-05-05T18:00:00', { capacity: 3 });
    const four = await questAt('2094-05-05T19:00:00', { capacity: 4 });

    const day = { from: '2094-05-05', to: '2094-05-05' };
    expect(await questsFound({ ...day, capacity: 4 })).toEqual([four]);
    expect(await questsFound({ ...day, capacity: 8 })).toEqual([]);
    expect(model.toolResults()).toEqual([
      {
        result: 'none',
        reason: 'No 파티 that the User can join for 8 people is found from 2094-05-05T00:00 to 2094-05-05T23:59.',
      },
    ]);
  });

  it('keeps the places left, the Join Policy and the number of Holders of each Quest', async () => {
    const quest = await questAt('2094-06-05T18:00:00', { joinPolicy: 'open', capacity: 4 });
    await joinQuest(app, await signInUser(app), quest).expect(201);

    await questsFound({ from: '2094-06-05', to: '2094-06-05' });

    expect(model.toolResults()).toEqual([
      expect.objectContaining({
        quests: [expect.objectContaining({ id: quest, placesLeft: 2, joinPolicy: 'open', holderCount: 2 })],
      }),
    ]);
  });
});

// More Quests than the list holds, all sooner than the one to find, and each left out by the condition.
function sooner(body: object, day: string): Promise<string[]> {
  return Promise.all(Array.from({ length: 31 }, () => questAt(`${day}T09:00:00`, body)));
}

describe('searchRecruitingQuests, before the list is cut', () => {
  it.each([
    ['Full', '2094-08-05', { capacity: 1 }, {}],
    ['with too few places left', '2094-08-06', { capacity: 2 }, { minPlacesLeft: 2 }],
    ['of another capacity', '2094-08-07', { capacity: 3 }, { capacity: 4 }],
  ])('finds the later Quest past those %s', async (_, day, body, condition) => {
    await sooner(body, day);
    const later = await questAt(`${day}T18:00:00`, { capacity: 4 });

    expect(await questsFound({ from: day, to: day, ...condition })).toEqual([later]);
    expect(model.toolResults()).toEqual([expect.objectContaining({ more: false })]);
  });

  it('finds the later Quest past those the reader asked to join', async () => {
    const asked = await sooner({ joinPolicy: 'approval' }, '2094-08-08');
    await Promise.all(asked.map((id) => askToJoin(app, reader, id).expect(201)));
    const later = await questAt('2094-08-08T18:00:00');

    expect(await questsFound({ from: '2094-08-08', to: '2094-08-08' })).toEqual([later]);
  });
});

describe('searchRecruitingQuests, with more conditions', () => {
  const broad = { from: '2094-07-05', to: '2094-07-06' };
  let eventId: string;
  let all: string[];

  beforeAll(async () => {
    const event = await eventAt('2094-07-05T18:00:00');
    eventId = event.id;
    await questFor(event);
    await questAt('2094-07-05T18:30:00', { capacity: 2, board: 'meal' });
    await questAt('2094-07-05T20:00:00', { capacity: 3, board: 'hobby', joinPolicy: 'approval' });
    await questAt('2094-07-06T18:00:00', { capacity: 4, board: 'hobby' });
    all = await questsFound(broad);
  });

  it.each([
    ['after', (): object => ({ after: '2094-07-05T19:00' })],
    ['before', (): object => ({ before: '2094-07-05T19:00' })],
    ['board', (): object => ({ board: 'hobby' })],
    ['globalEventId', (): object => ({ globalEventId: eventId })],
    ['minPlacesLeft', (): object => ({ minPlacesLeft: 2 })],
    ['capacity', (): object => ({ capacity: 3 })],
  ])('only ever narrows the result: %s', async (_, condition) => {
    const narrowed = await questsFound({ ...broad, ...condition() });

    expect(all).toHaveLength(4);
    expect(narrowed.length).toBeLessThan(all.length);
    expect(all).toEqual(expect.arrayContaining(narrowed));
  });
});
