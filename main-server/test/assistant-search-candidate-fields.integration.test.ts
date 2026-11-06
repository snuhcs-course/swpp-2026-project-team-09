/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { GlobalEvent, PrismaClient } from '../src/generated/prisma/client.js';
import { ask, postAssistantMessages } from './assistant.js';
import { signInUser, TestUser } from './friends.js';
import { refuseMatchServer } from './match-server.js';
import { connectToDatabase, ownQuest, storeEvent } from './quests.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// What the chat Assistant's two searches tell of each candidate (the words it matched, how it falls in the window, how
// it is joined) and how a search with more candidates than it gives counts them, with the scripted model in the model's
// place. The files share the database, so each test seeds what it reads in a month of 2089 or 2090 of its own, which no
// other file uses, and searches in that month or for its own Global Event.

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

const korea = (time: string): Date => new Date(`${time}+09:00`);

// An Open Quest of the leader's on the hobby Board that first meets at that time in Korea.
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

const candidate = z.looseObject({
  id: z.string(),
  matched: z.array(z.string()).optional(),
  window: z.string().optional(),
  join: z.string().optional(),
});

const resultSchema = z.array(
  z.looseObject({
    more: z.boolean(),
    total: z.number().optional(),
    narrowBy: z.record(z.string(), z.record(z.string(), z.number())).optional(),
    quests: z.array(candidate).default([]),
    events: z.array(candidate).default([]),
  }),
);

type Searched = z.output<typeof resultSchema>[number];

async function searched(tool: 'searchRecruitingQuests' | 'searchGlobalEvents', input: object): Promise<Searched> {
  model.script({ tool, input }, { text: '…' });
  await postAssistantMessages(app, reader.accessToken, ask('있어?'));
  const [result] = resultSchema.parse(model.toolResults());
  if (result === undefined) {
    throw new Error('The search gave no result');
  }
  return result;
}

// Each candidate's id with one of its fields.
const each = (candidates: z.output<typeof candidate>[], field: 'matched' | 'window' | 'join'): [string, unknown][] =>
  candidates.map((one) => [one.id, one[field]]);

describe('matched', () => {
  it('lists the words each Quest holds in its title or description, as given, and none for a Quest holding none, ranked as before', async () => {
    const day = { from: '2089-01-05', to: '2089-01-05' };
    const neither = await questAt('2089-01-05T09:00:00', { title: '보드게임' });
    const one = await questAt('2089-01-05T11:00:00', { title: '모임', description: '버스킹 보러 가요' });
    const both = await questAt('2089-01-05T13:00:00', { title: 'Concert', description: '버스킹도 봐요' });

    const { quests } = await searched('searchRecruitingQuests', {
      ...day,
      words: ['concert', '버스킹', 'CONCERT', '없는 말'],
    });

    expect(each(quests, 'matched')).toEqual([
      [both, ['concert', '버스킹']],
      [one, ['버스킹']],
      [neither, []],
    ]);
  });

  it('lists the words each event holds, and is left out when no words were given', async () => {
    const day = { from: '2089-02-05', to: '2089-02-05' };
    const held = await eventAt('2089-02-05T19:00:00', { title: '재즈 공연', description: '' });
    const other = await eventAt('2089-02-05T18:00:00', { title: '북토크', description: '' });

    expect(each((await searched('searchGlobalEvents', { ...day, words: ['공연'] })).events, 'matched')).toEqual([
      [held.id, ['공연']],
      [other.id, []],
    ]);
    expect(each((await searched('searchGlobalEvents', day)).events, 'matched')).toEqual([
      [other.id, undefined],
      [held.id, undefined],
    ]);
  });
});

describe('window', () => {
  it('is underWay for a Quest whose Global Event began before the window and overlaps it, and starts otherwise', async () => {
    const before = await eventAt('2089-03-04T10:00:00', { endsAt: korea('2089-03-06T18:00:00') });
    const inside = await eventAt('2089-03-05T12:00:00');
    const forBefore = await questFor(before);
    const forInside = await questFor(inside);
    const ownStart = await questAt('2089-03-05T15:00:00');

    const { quests } = await searched('searchRecruitingQuests', { from: '2089-03-05', to: '2089-03-05' });

    expect(each(quests, 'window')).toEqual([
      [forBefore, 'underWay'],
      [forInside, 'starts'],
      [ownStart, 'starts'],
    ]);
  });

  it('is underWay for an event that began before the window and overlaps it, and starts otherwise', async () => {
    const before = await eventAt('2089-04-04T22:00:00', { endsAt: korea('2089-04-05T10:00:00') });
    const atStart = await eventAt('2089-04-05T00:00:00');

    const { events } = await searched('searchGlobalEvents', { from: '2089-04-05', to: '2089-04-05' });

    expect(each(events, 'window')).toEqual([
      [before.id, 'underWay'],
      [atStart.id, 'starts'],
    ]);
  });

  it('is left out when no window was asked', async () => {
    const event = await eventAt('2089-05-05T10:00:00');
    const quest = await questFor(event);

    const { quests } = await searched('searchRecruitingQuests', { globalEventId: event.id });

    expect(each(quests, 'window')).toEqual([[quest, undefined]]);
  });
});

describe('join', () => {
  it('is open for an Open Quest and askToJoin for an Approval Quest', async () => {
    const open = await questAt('2089-06-05T09:00:00');
    const approval = await questAt('2089-06-05T10:00:00', { joinPolicy: 'approval' });

    const { quests } = await searched('searchRecruitingQuests', { from: '2089-06-05', to: '2089-06-05' });

    expect(each(quests, 'join')).toEqual([
      [open, 'open'],
      [approval, 'askToJoin'],
    ]);
  });
});

describe('narrowBy, of Quests', () => {
  it('counts every Quest the search finds, uncut, by Board, by day in Korea and by word', async () => {
    // 00:30 in Korea is the day before in UTC.
    const seeds = [
      ...Array.from({ length: 12 }, () => ({ time: '2090-01-05T00:30:00', board: 'meal', title: '점심 같이' })),
      ...Array.from({ length: 10 }, () => ({ time: '2090-01-05T20:00:00', board: 'hobby', title: '보드게임' })),
      ...Array.from({ length: 9 }, () => ({ time: '2090-01-06T10:00:00', board: 'hobby', title: '보드게임 점심' })),
      { time: '2090-01-06T23:30:00', board: 'show', title: '공연 같이' },
    ];
    await Promise.all(seeds.map(({ time, board, title }) => questAt(time, { board, title })));
    // Outside the window, or the reader's own: not found, so not counted.
    await questAt('2090-01-07T00:00:00', { board: 'meal', title: '점심 같이' });
    await ownQuest(app, reader, {
      joinPolicy: 'open',
      board: 'meal',
      title: '점심 같이',
      subQuest: { title: '모임', startsAt: korea('2090-01-05T12:00:00').toISOString() },
    });

    const result = await searched('searchRecruitingQuests', {
      from: '2090-01-05',
      to: '2090-01-06',
      words: ['점심', '보드게임', '없는 말'],
    });

    expect(result.quests).toHaveLength(30);
    expect(result.more).toBe(true);
    expect(result.total).toBe(32);
    expect(result.narrowBy).toEqual({
      board: { meal: 12, hobby: 19, show: 1 },
      day: { '2090-01-05': 22, '2090-01-06': 10 },
      word: { 점심: 21, 보드게임: 19, '없는 말': 0 },
    });
  });
});

describe('narrowBy, of events', () => {
  it('counts every event the search finds by day and by word, with no Board', async () => {
    await Promise.all([
      ...Array.from({ length: 20 }, () => eventAt('2090-02-05T18:00:00', { title: '재즈 공연' })),
      ...Array.from({ length: 11 }, () => eventAt('2090-02-06T00:30:00', { title: '북토크' })),
    ]);
    // Began the day before and is still on.
    await eventAt('2090-02-04T20:00:00', { title: '전시', endsAt: korea('2090-02-05T12:00:00') });

    const result = await searched('searchGlobalEvents', { from: '2090-02-05', to: '2090-02-06', words: ['공연'] });

    expect(result.events).toHaveLength(30);
    expect(result.total).toBe(32);
    expect(result.narrowBy).toEqual({
      day: { '2090-02-04': 1, '2090-02-05': 20, '2090-02-06': 11 },
      word: { 공연: 20 },
    });
  });
});

describe('narrowBy, with no more', () => {
  it('is not given, nor total, when the search gives every candidate it found', async () => {
    await Promise.all(Array.from({ length: 30 }, () => questAt('2090-03-05T09:00:00')));

    const result = await searched('searchRecruitingQuests', { from: '2090-03-05', to: '2090-03-05', words: ['모임'] });

    expect(result.quests).toHaveLength(30);
    expect(result.more).toBe(false);
    expect(result).not.toHaveProperty('total');
    expect(result).not.toHaveProperty('narrowBy');
  });
});
