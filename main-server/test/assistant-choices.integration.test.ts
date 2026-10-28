/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { GlobalEvent, PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { ask, postAssistantMessages } from './assistant.js';
import { befriend, endFriendship, signInUser, TestUser } from './friends.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';
import { refuseMatchServer } from './match-server.js';

// The candidates a reply offers as choices, and the candidate a User's message answers with (P07 ticket 02), with the
// scripted model in the model's place. The app's clock stands in April 2097, which no other file uses, and the
// Friends' names and the events' titles are this file's own. The seed's Places are shared, and only read.

let app: INestApplication<Server>;
let prisma: PrismaClient;
let user: TestUser;
let minji: TestUser;
let minho: TestUser;
// A Friend no more.
let mina: TestUser;
let studentCentre: string;
let dayShow: GlobalEvent;
let nightShow: GlobalEvent;
let pastShow: GlobalEvent;
const model = new ScriptedModel();

// 2097-04-01 09:00 in Korea.
const NOW = new Date('2097-04-01T00:00:00Z');

function named(name: string): Promise<TestUser> {
  return signInUser(app, { name, department: '컴퓨터공학부' });
}

function eventAt(title: string, koreaTime: string): Promise<GlobalEvent> {
  const startsAt = new Date(`${koreaTime}+09:00`);
  return storeEvent(prisma, { title, startsAt, endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000) });
}

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, refuseMatchServer, model.model);
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(NOW);
  prisma = connectToDatabase();
  [user, minji, minho, mina] = await Promise.all(
    ['홍길동', '팔구민지', '팔구민호', '팔구민아'].map((name) => named(name)),
  );
  await befriend(app, user, minji);
  await befriend(app, user, minho);
  await befriend(app, user, mina);
  expect((await endFriendship(app, user, mina.id)).status).toBe(204);
  studentCentre = (await prisma.place.findFirstOrThrow({ where: { name: '학생회관' } })).id;
  dayShow = await eventAt('2097 봄 축제 낮 공연', '2097-04-10T13:00:00');
  nightShow = await eventAt('2097 봄 축제 밤 공연', '2097-04-10T19:00:00');
  pastShow = await eventAt('2097 지난 공연', '2097-03-20T19:00:00');
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

function send(messages: readonly object[]): Promise<{ status: number; body: unknown }> {
  return postAssistantMessages(app, user.accessToken, messages);
}

const choicesSchema = z.object({
  choices: z.array(z.object({ kind: z.string(), id: z.string(), label: z.string(), words: z.string() })),
});

function choicesOf(body: unknown): z.infer<typeof choicesSchema>['choices'] {
  return choicesSchema.parse(body).choices;
}

// Each User message as the model's first call read it.
function userContents(): string[] {
  const prompt = model.received()[0]?.prompt ?? [];
  return prompt.flatMap((message) =>
    message.role === 'user' ? [message.content.map((part) => (part.type === 'text' ? part.text : '')).join('')] : [],
  );
}

// The fields proposeQuest refused, as the model received them.
function refusedFields(): string[] {
  const [result] = z.array(z.object({ fields: z.record(z.string(), z.string()) }).loose()).parse(model.toolResults());
  return Object.keys(result?.fields ?? {});
}

describe('the choices of a reply', () => {
  it('lists the candidates of a several answer, in its order, by name, with the words trimmed', async () => {
    model.script({ tool: 'resolvePlace', input: { words: ' 학관 ' } }, { text: '어느 학관이요?' });

    const response = await send(ask('학관에서 보자'));

    expect(response.status).toBe(200);
    const [answer] = model.toolResults();
    const { candidates } = z
      .object({ candidates: z.array(z.object({ id: z.string(), name: z.string() })) })
      .parse(answer);
    expect(candidates.length).toBeGreaterThan(1);
    expect(choicesOf(response.body)).toEqual(
      candidates.map(({ id, name }) => ({ kind: 'place', id, label: name, words: '학관' })),
    );
  });

  it('lists Friends and events by their names and titles outside the delimiters, each once in a run', async () => {
    model.script(
      { tool: 'resolveFriend', input: { name: '팔구민' } },
      { tool: 'resolveFriend', input: { name: '팔구 민' } },
      { tool: 'resolveGlobalEvent', input: { words: '2097 봄 축제' } },
      { text: '누구와 어느 공연이요?' },
    );

    const response = await send(ask('팔구민이랑 2097 봄 축제 가는 파티'));

    expect(choicesOf(response.body)).toEqual([
      { kind: 'friend', id: minji.id, label: '팔구민지', words: '팔구민' },
      { kind: 'friend', id: minho.id, label: '팔구민호', words: '팔구민' },
      { kind: 'globalEvent', id: dayShow.id, label: dayShow.title, words: '2097 봄 축제' },
      { kind: 'globalEvent', id: nightShow.id, label: nightShow.title, words: '2097 봄 축제' },
    ]);
  });

  it('lists none for answers of one or none', async () => {
    model.script(
      { tool: 'resolvePlace', input: { words: '301동' } },
      { tool: 'resolveFriend', input: { name: '없는사람' } },
      { text: '…' },
    );

    const response = await send(ask('301동에서 없는사람이랑'));

    expect(choicesOf(response.body)).toEqual([]);
  });
});

// A complete Open Proposal on the meal Board, for the next day's lunch, without its Place.
const LUNCH = {
  title: '2097 학관 점심',
  description: '학관에서 점심 같이 먹어요',
  joinPolicy: 'open',
  board: 'meal',
  capacity: 4,
  startsAt: '2097-04-02T12:00:00+09:00',
};

// The User's answer to the question which 학관, tapped from its chips, or typed when `chosen` is undefined.
function answering(text: string, chosen?: object): object[] {
  return [
    { role: 'user', text: '내일 점심에 학관에서 4명 모집해줘, 식사 게시판에' },
    { role: 'assistant', text: '어느 학관이요?' },
    { role: 'user', text, chosen },
  ];
}

describe('a Place the User chose', () => {
  it('is taken by proposeQuest with no resolver call, and read under the message', async () => {
    model.script(
      { tool: 'proposeQuest', input: { ...LUNCH, placeId: studentCentre } },
      { text: '만들기를 눌러 주세요.' },
    );

    const response = await send(answering('학생회관', { kind: 'place', id: studentCentre, words: '학관' }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ proposal: { place: { id: studentCentre, name: '학생회관' } } });
    expect(userContents().at(-1)).toBe(`학생회관\n\n[Chosen: place ${studentCentre} "학생회관" for "학관"]`);
  });

  it('is refused by proposeQuest when the message only names it', async () => {
    model.script({ tool: 'proposeQuest', input: { ...LUNCH, placeId: studentCentre } }, { text: '…' });

    await send(answering('학생회관'));

    expect(refusedFields()).toEqual(['placeId']);
  });

  it("is only read on an earlier message, which the next message's run does not take", async () => {
    model.script({ tool: 'proposeQuest', input: { ...LUNCH, placeId: studentCentre } }, { text: '…' });

    await send([
      ...answering('학생회관', { kind: 'place', id: studentCentre, words: '학관' }),
      { role: 'assistant', text: '몇 명이요?' },
      { role: 'user', text: '4명' },
    ]);

    expect(userContents()[1]).toBe(`학생회관\n\n[Chosen: place ${studentCentre} "학생회관" for "학관"]`);
    expect(refusedFields()).toEqual(['placeId']);
  });
});

// A complete Closed Proposal for the next day's dinner, without its Friends.
const DINNER = {
  title: '2097 비공개 저녁',
  description: '',
  joinPolicy: 'closed',
  capacity: 2,
  startsAt: '2097-04-02T18:00:00+09:00',
};

describe('a Friend or an event the User chose', () => {
  it("is read with the Friend's name inside delimiters, and invited", async () => {
    model.script({ tool: 'proposeQuest', input: { ...DINNER, inviteeIds: [minji.id] } }, { text: '…' });

    const response = await send(answering('팔구민지', { kind: 'friend', id: minji.id, words: '민지' }));

    expect(response.body).toMatchObject({ proposal: { invitees: [{ id: minji.id, name: '팔구민지' }] } });
    expect(userContents().at(-1)).toBe(
      `팔구민지\n\n[Chosen: friend ${minji.id} "<data label="friend.name">팔구민지</data>" for "민지"]`,
    );
  });

  it('is dropped when it is no Friend any more, and the text stands', async () => {
    model.script({ tool: 'proposeQuest', input: { ...DINNER, inviteeIds: [mina.id] } }, { text: '…' });

    const response = await send(answering('팔구민아', { kind: 'friend', id: mina.id, words: '민아' }));

    expect(response.status).toBe(200);
    expect(userContents().at(-1)).toBe('팔구민아');
    expect(refusedFields()).toEqual(['inviteeIds']);
  });

  it('is dropped when the event has ended', async () => {
    model.script({ text: '…' });

    const response = await send(answering(pastShow.title, { kind: 'globalEvent', id: pastShow.id, words: '지난' }));

    expect(response.status).toBe(200);
    expect(userContents().at(-1)).toBe(pastShow.title);
  });

  it.each([
    { kind: 'quest', id: '00000000-0000-4000-8000-000000000000', words: '학관' },
    { kind: 'place', id: 'not-an-id', words: '학관' },
    { kind: 'place', id: '00000000-0000-4000-8000-000000000000', words: '가'.repeat(51) },
    { kind: 'place', id: '00000000-0000-4000-8000-000000000000', words: '학관', label: '학생회관' },
  ])('refuses with 400, before the model is called, the choice %j', async (chosen) => {
    model.script();

    const response = await send(answering('학생회관', chosen));

    expect(response.status).toBe(400);
    expect(model.received()).toEqual([]);
  });
});
