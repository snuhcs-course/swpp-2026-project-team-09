/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-26  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { GlobalEvent, PrismaClient } from '../src/generated/prisma/client.js';
import { PLACE_GROUPS } from '../src/places/place-groups.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { ask, postAssistantMessages } from './assistant.js';
import { befriend, signInUser, TestUser } from './friends.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';
import { refuseMatchServer } from './match-server.js';

// The chat Assistant's resolvers, with the scripted model in the model's place. The app's clock stands in March 2095,
// which no other file uses, and the Friends' names and the events' titles are this file's own. The seed's Places are
// shared, and only read.

let app: INestApplication<Server>;
let prisma: PrismaClient;
let user: TestUser;
const model = new ScriptedModel();

// 2095-03-02 09:00 in Korea.
const NOW = new Date('2095-03-02T00:00:00Z');

// The User's Friends, two of whom share the words 칠민수, and a User of that name who is no Friend.
const friends = { garam: '가람칠민수', narae: '나래칠민수', jieun: '칠지은' };
const STRANGER = '다솜칠민수';
const ONLY_STRANGER = '칠보람';
let friendIds: Record<keyof typeof friends, string>;

let lunchShow: GlobalEvent;
let nightShow: GlobalEvent;
let jazz: GlobalEvent;

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
  user = await named('홍길동');
  const [garam, narae, jieun] = await Promise.all(Object.values(friends).map((name) => named(name)));
  if (garam === undefined || narae === undefined || jieun === undefined) {
    throw new Error('The Friends were not signed in');
  }
  await Promise.all([garam, narae, jieun].map((friend) => befriend(app, user, friend)));
  friendIds = { garam: garam.id, narae: narae.id, jieun: jieun.id };
  const stranger = await named(STRANGER);
  const onlyStranger = await named(ONLY_STRANGER);
  // Friends of a Friend, never of the User.
  await befriend(app, garam, stranger);
  await befriend(app, garam, onlyStranger);
  lunchShow = await eventAt('2095 봄 축제 낮 공연', '2095-03-10T13:00:00');
  nightShow = await eventAt('2095 봄 축제 밤 공연', '2095-03-10T19:00:00');
  jazz = await eventAt('2095 봄 재즈 콘서트', '2095-03-12T19:00:00');
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

// What the resolver answered the model, after calling it with `input` on the User's `text`.
async function resolve(tool: string, input: object, text = '…'): Promise<unknown> {
  model.script({ tool, input }, { text: '…' });
  const response = await postAssistantMessages(app, user.accessToken, ask(text));
  expect(response.status).toBe(200);
  const [result] = model.toolResults();
  return result;
}

function friendName(name: string): string {
  return `<data label="friend.name">${name}</data>`;
}

describe('resolveFriend', () => {
  it('answers the one Friend a name matches, by name and id only', async () => {
    expect(await resolve('resolveFriend', { name: '칠지은' }, '칠지은 초대해줘')).toEqual({
      result: 'one',
      candidate: { id: friendIds.jieun, name: friendName(friends.jieun) },
    });
  });

  it('answers both Friends a name matches, ignoring spaces, and never the User of that name who is no Friend', async () => {
    expect(await resolve('resolveFriend', { name: '칠 민수' })).toEqual({
      result: 'several',
      candidates: [
        { id: friendIds.garam, name: friendName(friends.garam) },
        { id: friendIds.narae, name: friendName(friends.narae) },
      ],
      more: false,
    });
  });

  it('answers none when only a User who is no Friend has the name', async () => {
    expect(await resolve('resolveFriend', { name: ONLY_STRANGER })).toEqual({
      result: 'none',
      reason: `No Friend of the User has a name holding ${ONLY_STRANGER}.`,
    });
  });
});

describe('resolvePlace', () => {
  it('answers the one Place of a building number', async () => {
    expect(await resolve('resolvePlace', { words: '301동' })).toEqual({
      result: 'one',
      candidate: { id: expect.any(String) as unknown, name: '제1공학관', number: '301' },
    });
  });

  it('answers the Places a shared name without its number stands for, as several', async () => {
    const answer = await resolve('resolvePlace', { words: '공학관' });

    expect(answer).toMatchObject({ result: 'several', more: false });
    const { candidates } = z.object({ candidates: z.array(z.object({ name: z.string() })) }).parse(answer);
    expect(candidates).toHaveLength(10);
    expect(candidates.every(({ name }) => name.includes('공학관'))).toBe(true);
  });
});

// A short form the rules make from the name (P07 ticket 01): the tier that finds it answers alone, so 학관 brings no
// 공학관 or 약학관, which only hold the letters.
describe('resolvePlace on short forms', () => {
  it('answers the Places a short form stands for, 학생회관 first for 학관', async () => {
    const answer = await resolve('resolvePlace', { words: '학관' });

    expect(answer).toMatchObject({ result: 'several', more: false });
    const { candidates } = z.object({ candidates: z.array(z.object({ name: z.string() })) }).parse(answer);
    expect(candidates[0]?.name).toBe('학생회관');
    expect(new Set(candidates.map(({ name }) => name))).toEqual(
      new Set(['학생회관', '(관악사)학부 생활관', '유회진 학술정보관']),
    );
  });

  it('answers the Places whose names or short forms have the 초성 of all-consonant words, at most ten', async () => {
    const answer = await resolve('resolvePlace', { words: 'ㅎㄱ' });

    expect(answer).toMatchObject({ result: 'several', more: true });
    const { candidates } = z.object({ candidates: z.array(z.object({ name: z.string() })) }).parse(answer);
    expect(candidates).toHaveLength(10);
    expect(candidates.map(({ name }) => name)).toContain('학생회관');
  });

  it('answers the buildings of a curated group, as several, at most ten', async () => {
    const answer = await resolve('resolvePlace', { words: '공대' });

    expect(answer).toMatchObject({ result: 'several', more: true });
    const { candidates } = z.object({ candidates: z.array(z.object({ number: z.string().nullable() })) }).parse(answer);
    const group = PLACE_GROUPS.find(({ words }) => words.includes('공대'));
    expect(candidates).toHaveLength(10);
    expect(candidates.every(({ number }) => number !== null && (group?.numbers ?? []).includes(number))).toBe(true);
  });

  it('answers none for words no Place has', async () => {
    expect(await resolve('resolvePlace', { words: '없는건물' })).toMatchObject({ result: 'none' });
  });
});

describe('resolveGlobalEvent', () => {
  it('answers both published events a word matches, the earliest first', async () => {
    const answer = await resolve('resolveGlobalEvent', { words: '2095 봄 축제' });

    expect(answer).toMatchObject({
      result: 'several',
      candidates: [
        {
          id: lunchShow.id,
          title: `<data label="globalEvent.title">${lunchShow.title}</data>`,
          startsAt: '2095-03-10T13:00:00+09:00',
        },
        { id: nightShow.id },
      ],
    });
  });

  it('answers the one event of a period', async () => {
    expect(
      await resolve('resolveGlobalEvent', { words: '2095 봄', from: '2095-03-12', to: '2095-03-12' }),
    ).toMatchObject({ result: 'one', candidate: { id: jazz.id } });
  });

  it('never answers an event that is not published', async () => {
    const draft = await storeEvent(prisma, {
      title: '2095 봄 초안 행사',
      startsAt: new Date('2095-03-20T10:00:00+09:00'),
      endsAt: null,
      state: 'draft',
    });

    expect(await resolve('resolveGlobalEvent', { words: draft.title })).toMatchObject({ result: 'none' });
  });
});

describe('the system prompt', () => {
  it('tells the model to ask on several candidates and to say so on none', async () => {
    await resolve('resolveFriend', { name: '칠지은' });

    expect(model.system()).toContain("when a resolver answers 'several', ask which one");
    expect(model.system()).toContain("when it answers 'none', say that nothing matches");
  });
});
