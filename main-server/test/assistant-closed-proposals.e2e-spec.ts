/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { GlobalEvent, PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { ask, postAssistantMessages } from './assistant.js';
import { befriend, signInUser, TestUser } from './friends.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { type Step, ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';
import { refuseMatchServer } from './match-server.js';

// proposeQuest with Closed Quests, invited Friends, a Place and a Global Event, after the resolvers, with the scripted
// model in the model's place. The app's clock stands in June 2095, which no other file uses, and the Friends' names
// and the events' titles are this file's own. The seed's Places are shared, and only read.

let app: INestApplication<Server>;
let prisma: PrismaClient;
let user: TestUser;
let haneul: TestUser;
let bada: TestUser;
let stranger: TestUser;
let festival: GlobalEvent;
const model = new ScriptedModel();

// 2095-06-01 09:00 in Korea.
const NOW = new Date('2095-06-01T00:00:00Z');

// The id of 제1공학관 (301동), as the seed gives it in every database.
let place301: string;

function named(name: string): Promise<TestUser> {
  return signInUser(app, { name, department: '컴퓨터공학부' });
}

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, refuseMatchServer, model.model);
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(NOW);
  prisma = connectToDatabase();
  [user, haneul, bada, stranger] = await Promise.all(
    ['홍길동', '육칠하늘', '육칠바다', '육칠구름'].map((name) => named(name)),
  );
  await befriend(app, user, haneul);
  await befriend(app, user, bada);
  place301 = (await prisma.place.findFirstOrThrow({ where: { number: '301' } })).id;
  const startsAt = new Date('2095-06-10T18:00:00+09:00');
  festival = await storeEvent(prisma, {
    title: '2095 초여름 축제',
    startsAt,
    endsAt: new Date(startsAt.getTime() + 3 * 60 * 60 * 1000),
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

// A Closed Quest for tomorrow's dinner, with no Board and no Friend yet.
const DINNER = {
  title: '2095 비공개 저녁',
  description: '',
  joinPolicy: 'closed',
  capacity: 4,
  startsAt: '2095-06-02T18:00:00+09:00',
};

function dinner(changes: object = {}): object {
  return { ...DINNER, ...changes };
}

const resolveHaneul: Step = { tool: 'resolveFriend', input: { name: '육칠하늘' } };
const resolveFriends: Step[] = [resolveHaneul, { tool: 'resolveFriend', input: { name: '육칠바다' } }];

async function send(steps: Step[], messages: readonly object[] = ask('…')): Promise<{ proposal: unknown }> {
  model.script(...steps, { text: '만들기를 누르면 파티가 만들어져요.' });
  const response = await postAssistantMessages(app, user.accessToken, messages);
  expect(response.status).toBe(200);
  return z.object({ proposal: z.unknown() }).parse(response.body);
}

// The fields proposeQuest, the last tool called, refused.
function refusedFields(): string[] {
  const result = z.object({ fields: z.record(z.string(), z.string()) }).safeParse(model.toolResults().at(-1));
  return Object.keys(result.data?.fields ?? {}).toSorted();
}

describe('a Closed Proposal with Friends, a Place and a Global Event', () => {
  it('passes with the ids the resolvers returned, starts with the event and names each for the card', async () => {
    const body = await send([
      ...resolveFriends,
      { tool: 'resolvePlace', input: { words: '301동' } },
      { tool: 'resolveGlobalEvent', input: { words: '초여름 축제' } },
      {
        tool: 'proposeQuest',
        input: dinner({
          startsAt: undefined,
          inviteeIds: [haneul.id, bada.id],
          placeId: place301,
          globalEventId: festival.id,
        }),
      },
    ]);

    expect(body.proposal).toEqual({
      ...DINNER,
      board: null,
      startsAt: '2095-06-10T18:00:00+09:00',
      place: { id: place301, name: '제1공학관' },
      globalEvent: expect.objectContaining({ id: festival.id, title: festival.title }) as unknown,
      invitees: [
        { id: bada.id, name: '육칠바다' },
        { id: haneul.id, name: '육칠하늘' },
      ],
    });
  });

  it('keeps a meeting time before the event, and refuses one after its start', async () => {
    const steps = (startsAt: string): Step[] => [
      resolveHaneul,
      { tool: 'resolveGlobalEvent', input: { words: '초여름 축제' } },
      { tool: 'proposeQuest', input: dinner({ startsAt, inviteeIds: [haneul.id], globalEventId: festival.id }) },
    ];

    expect(await send(steps('2095-06-10T17:00:00+09:00'))).toMatchObject({
      proposal: { startsAt: '2095-06-10T17:00:00+09:00', globalEvent: { id: festival.id } },
    });
    expect(await send(steps('2095-06-10T19:00:00+09:00'))).toMatchObject({ proposal: null });
    expect(refusedFields()).toEqual(['startsAt']);
  });
});

describe('proposeQuest refusing a Closed Proposal', () => {
  it('without an invited Friend, on that field', async () => {
    expect(await send([{ tool: 'proposeQuest', input: dinner() }])).toEqual(
      expect.objectContaining({ proposal: null }),
    );
    expect(refusedFields()).toEqual(['inviteeIds']);
  });

  it('with a Board', async () => {
    await send([resolveHaneul, { tool: 'proposeQuest', input: dinner({ board: 'meal', inviteeIds: [haneul.id] }) }]);

    expect(refusedFields()).toEqual(['board']);
  });

  it('with ids no resolver returned in this message, field by field', async () => {
    await send([
      {
        tool: 'proposeQuest',
        input: dinner({ inviteeIds: [haneul.id], placeId: place301, globalEventId: festival.id }),
      },
    ]);

    expect(refusedFields()).toEqual(['globalEventId', 'inviteeIds', 'placeId']);
  });

  it('with more invited Friends than the capacity holds besides the User', async () => {
    await send([
      ...resolveFriends,
      { tool: 'proposeQuest', input: dinner({ capacity: 2, inviteeIds: [haneul.id, bada.id] }) },
    ]);

    expect(refusedFields()).toEqual(['inviteeIds']);
  });
});

// The conversation that sent back a Closed Proposal at 301동 inviting `invitees`, then asks for another time.
function conversation(invitees: object[]): object[] {
  return [
    { role: 'user', text: '내일 저녁 육칠하늘이랑 비공개로' },
    {
      role: 'assistant',
      text: '만들기를 누르면 파티가 만들어져요.',
      cards: [],
      proposal: { ...DINNER, board: null, place: { id: place301, name: '제1공학관' }, globalEvent: null, invitees },
    },
    { role: 'user', text: '시간만 7시로' },
  ];
}

describe('a Closed Proposal sent back', () => {
  it('takes its ids again without a resolver', async () => {
    const body = await send(
      [
        {
          tool: 'proposeQuest',
          input: dinner({ startsAt: '2095-06-02T19:00:00+09:00', inviteeIds: [haneul.id], placeId: place301 }),
        },
      ],
      conversation([{ id: haneul.id, name: '육칠하늘' }]),
    );

    expect(body.proposal).toMatchObject({
      startsAt: '2095-06-02T19:00:00+09:00',
      place: { id: place301 },
      invitees: [{ id: haneul.id }],
    });
  });

  it('refuses a User in it who is no Friend', async () => {
    await send(
      [{ tool: 'proposeQuest', input: dinner({ inviteeIds: [stranger.id] }) }],
      conversation([{ id: stranger.id, name: '육칠구름' }]),
    );

    expect(refusedFields()).toEqual(['inviteeIds']);
  });
});
