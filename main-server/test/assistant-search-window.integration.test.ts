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
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { ask, postAssistantMessages } from './assistant.js';
import { signInUser, TestUser } from './friends.js';
import { refuseMatchServer } from './match-server.js';
import { connectToDatabase, ownQuest, place132, storeEvent, subQuestIn } from './quests.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// The time window of the chat Assistant's searchGlobalEvents and searchRecruitingQuests, with the scripted model in the
// model's place. The files share the database, so each test seeds what it reads in a month of 2093 of its own, which no
// other file uses, and always searches in that month.

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

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

const korea = (time: string): Date => new Date(`${time}+09:00`);

function clockAt(time: string): void {
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(korea(time));
}

// An Open Quest of the leader's that first meets at that time in Korea.
function questAt(time: string, body: object = {}): Promise<string> {
  return ownQuest(app, leader, {
    joinPolicy: 'open',
    subQuest: { title: '모임', startsAt: korea(time).toISOString() },
    ...body,
  });
}

// A published event at that time in Korea, of two hours unless `changes` say otherwise.
function eventAt(time: string, changes: Parameters<typeof storeEvent>[1] = {}): Promise<GlobalEvent> {
  const startsAt = korea(time);
  return storeEvent(prisma, { startsAt, endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000), ...changes });
}

// An Open Quest of the leader's for the event.
async function questFor(event: GlobalEvent): Promise<string> {
  const quest = await prisma.quest.create({
    data: {
      title: '같이 가요',
      globalEventId: event.id,
      leaderId: leader.id,
      joinPolicy: 'open',
      board: 'show',
      holders: { create: { userId: leader.id, globalEventId: event.id } },
      subQuests: { create: { attending: true } },
    },
  });
  return quest.id;
}

const idsSchema = z.array(z.object({ id: z.string() }));

// The ids the search, called with that input, gave the model.
async function questsFound(input: object): Promise<string[]> {
  model.script({ tool: 'searchRecruitingQuests', input }, { text: '…' });
  await postAssistantMessages(app, reader.accessToken, ask('파티 있어?'));
  const [result] = z.array(z.object({ quests: idsSchema.default([]) })).parse(model.toolResults());
  return result?.quests.map(({ id }) => id) ?? [];
}

async function eventsFound(input: object): Promise<string[]> {
  model.script({ tool: 'searchGlobalEvents', input }, { text: '…' });
  await postAssistantMessages(app, reader.accessToken, ask('행사 있어?'));
  const [result] = z.array(z.object({ events: idsSchema.default([]) })).parse(model.toolResults());
  return result?.events.map(({ id }) => id) ?? [];
}

describe('searchRecruitingQuests, in a window of times', () => {
  it('with only after, holds that minute and ends at 23:59 of that day', async () => {
    await questAt('2093-01-05T16:30:00');
    const atStart = await questAt('2093-01-05T17:00:00');
    const atEnd = await questAt('2093-01-05T23:59:00');
    await questAt('2093-01-06T00:00:00');

    expect(await questsFound({ after: '2093-01-05T17:00' })).toEqual([atStart, atEnd]);
  });

  it('with both ends, holds both', async () => {
    await questAt('2093-02-05T14:59:00');
    const first = await questAt('2093-02-05T15:00:00');
    const last = await questAt('2093-02-05T18:00:00');
    await questAt('2093-02-05T18:01:00');

    expect(await questsFound({ after: '2093-02-05T15:00', before: '2093-02-05T18:00' })).toEqual([first, last]);
  });

  it('with only before, starts at 00:00 of that day', async () => {
    await questAt('2093-03-04T23:59:00');
    const morning = await questAt('2093-03-05T00:00:00');
    await questAt('2093-03-05T12:01:00');

    expect(await questsFound({ before: '2093-03-05T12:00' })).toEqual([morning]);
  });

  it('gives the evening of a day whose morning alone is more than the list holds', async () => {
    await Promise.all(Array.from({ length: 21 }, () => questAt('2093-04-05T09:00:00')));
    const evening = await questAt('2093-04-05T18:00:00');

    expect(await questsFound({ after: '2093-04-05T17:00' })).toEqual([evening]);
  });
});

describe('searchRecruitingQuests, by its first Sub Quest', () => {
  it("goes by the first Sub Quest's start, not by a later one", async () => {
    const quest = await questAt('2093-05-05T18:00:00');
    await subQuestIn(app, leader, quest, { title: '뒤풀이', startsAt: korea('2093-05-06T18:00:00').toISOString() });

    expect(await questsFound({ from: '2093-05-05', to: '2093-05-05' })).toEqual([quest]);
    expect(await questsFound({ from: '2093-05-06', to: '2093-05-06' })).toEqual([]);
  });

  it('refuses a window that ends before it starts, back to the model', async () => {
    model.script(
      { tool: 'searchRecruitingQuests', input: { after: '2093-05-05T18:00', before: '2093-05-05T17:00' } },
      { text: '…' },
    );

    await postAssistantMessages(app, reader.accessToken, ask('파티 있어?'));

    expect(JSON.stringify(model.received().at(-1)?.prompt)).toContain('The window must not end before it starts');
  });
});

describe('searchRecruitingQuests, once its start has passed', () => {
  it('never gives a Quest that started, with a window or without, nor one whose time is gone', async () => {
    const started = await questAt('2093-06-05T10:00:00');
    const ahead = await questAt('2093-06-05T18:00:00');
    clockAt('2093-06-05T12:00:00');

    expect(await questsFound({ from: '2093-06-05', to: '2093-06-05' })).toEqual([ahead]);
    expect(await questsFound({})).not.toContain(started);
  });
});

describe('searchRecruitingQuests, for a Global Event', () => {
  it('gives a Quest for an event under way, in a window it overlaps and without one, until the event ends', async () => {
    const event = await eventAt('2093-07-01T10:00:00', { endsAt: korea('2093-07-10T18:00:00') });
    const quest = await questFor(event);
    clockAt('2093-07-05T12:00:00');

    expect(await questsFound({ after: '2093-07-05T17:00' })).toEqual([quest]);
    expect(await questsFound({ globalEventId: event.id })).toEqual([quest]);
    expect(await questsFound({ from: '2093-07-11', to: '2093-07-11' })).toEqual([]);

    clockAt('2093-07-10T18:00:00');

    expect(await questsFound({ globalEventId: event.id })).toEqual([]);
  });

  it('takes an event without an end to last until the end of its start’s day', async () => {
    const event = await eventAt('2093-08-05T10:00:00', { endsAt: null });
    const quest = await questFor(event);
    clockAt('2093-08-05T22:00:00');

    expect(await questsFound({ after: '2093-08-05T23:00' })).toEqual([quest]);

    clockAt('2093-08-06T00:00:00');

    expect(await questsFound({ globalEventId: event.id })).toEqual([]);
  });
});

describe('searchRecruitingQuests, reading its event', () => {
  it("reads a Quest's time and place from its event as it is now, and gives none for a cancelled event", async () => {
    const event = await eventAt('2093-09-05T10:00:00');
    const quest = await questFor(event);
    await prisma.globalEvent.update({
      where: { id: event.id },
      data: { startsAt: korea('2093-09-07T19:00:00'), endsAt: null, place: '문화관', ...place132 },
    });

    expect(await questsFound({ from: '2093-09-05', to: '2093-09-05' })).toEqual([]);
    expect(await questsFound({ from: '2093-09-07', to: '2093-09-07' })).toEqual([quest]);
    expect(model.toolResults()).toEqual([
      expect.objectContaining({
        quests: [
          expect.objectContaining({
            next: {
              startsAt: '2093-09-07T19:00:00+09:00',
              endsAt: null,
              place: '<data label="quest.place">문화관</data>',
            },
          }),
        ],
      }),
    ]);

    await prisma.globalEvent.update({ where: { id: event.id }, data: { state: 'cancelled' } });

    expect(await questsFound({ globalEventId: event.id })).toEqual([]);
  });
});

describe('searchGlobalEvents, in a window of times', () => {
  it('with only after, gives what overlaps until 23:59 of that day, an event under way among them', async () => {
    const week = await eventAt('2093-10-01T10:00:00', { endsAt: korea('2093-10-08T18:00:00') });
    const running = await eventAt('2093-10-05T16:00:00');
    const noEnd = await eventAt('2093-10-05T10:00:00', { endsAt: null });
    const evening = await eventAt('2093-10-05T19:00:00');
    await eventAt('2093-10-05T12:00:00');
    await eventAt('2093-10-06T00:00:00');

    expect(await eventsFound({ after: '2093-10-05T17:00' })).toEqual(
      [week, noEnd, running, evening].map(({ id }) => id),
    );
  });

  it('with both ends, gives what overlaps them', async () => {
    const first = await eventAt('2093-11-05T13:01:00');
    const last = await eventAt('2093-11-05T18:00:00');
    await eventAt('2093-11-05T18:01:00');
    // It ends as the window starts, so they do not overlap.
    await eventAt('2093-11-05T13:00:00');

    expect(await eventsFound({ after: '2093-11-05T15:00', before: '2093-11-05T18:00' })).toEqual([first.id, last.id]);
  });

  it('gives the evening of a day whose morning alone is more than the list holds', async () => {
    await Promise.all(Array.from({ length: 21 }, () => eventAt('2093-12-05T09:00:00')));
    const evening = await eventAt('2093-12-05T18:00:00');

    expect(await eventsFound({ after: '2093-12-05T17:00' })).toEqual([evening.id]);
  });

  it('refuses a search with no window at all, back to the model', async () => {
    model.script({ tool: 'searchGlobalEvents', input: {} }, { text: '…' });

    await postAssistantMessages(app, reader.accessToken, ask('행사 있어?'));

    expect(JSON.stringify(model.received().at(-1)?.prompt)).toContain('Give from and to, or after or before');
  });
});
