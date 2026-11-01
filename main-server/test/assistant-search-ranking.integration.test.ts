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
import { connectToDatabase, ownQuest, storeEvent } from './quests.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// How words rank the candidates of the chat Assistant's two searches, and how many they give, with the scripted model in
// the model's place. The files share the database, so each test seeds what it reads on a day of 2092 of its own, which no
// other file uses, and always searches on that day.

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

function questAt(time: string, body: object = {}): Promise<string> {
  return ownQuest(app, leader, {
    joinPolicy: 'open',
    subQuest: { title: '모임', startsAt: korea(time).toISOString() },
    ...body,
  });
}

function eventAt(time: string, changes: Parameters<typeof storeEvent>[1] = {}): Promise<GlobalEvent> {
  return storeEvent(prisma, { startsAt: korea(time), endsAt: korea(time), ...changes });
}

const resultSchema = z.array(
  z.object({
    more: z.boolean().optional(),
    quests: z.array(z.object({ id: z.string(), description: z.string() })).default([]),
    events: z.array(z.object({ id: z.string(), description: z.string() })).default([]),
  }),
);

async function search(
  tool: 'searchRecruitingQuests' | 'searchGlobalEvents',
  input: object,
): Promise<{ more: boolean | undefined; candidates: { id: string; description: string }[] }> {
  model.script({ tool, input }, { text: '…' });
  await postAssistantMessages(app, reader.accessToken, ask('있어?'));
  const [result] = resultSchema.parse(model.toolResults());
  return { more: result?.more, candidates: [...(result?.quests ?? []), ...(result?.events ?? [])] };
}

const questsFound = async (input: object): Promise<string[]> =>
  (await search('searchRecruitingQuests', input)).candidates.map(({ id }) => id);

const eventsFound = async (input: object): Promise<string[]> =>
  (await search('searchGlobalEvents', input)).candidates.map(({ id }) => id);

describe('searchRecruitingQuests, given words', () => {
  const day = { from: '2092-01-05', to: '2092-01-05' };

  it('puts those holding more of the words first, ties in start order, and fills the rest of the window', async () => {
    const neither = await questAt('2092-01-05T09:00:00', { title: '점심 같이' });
    const oneLater = await questAt('2092-01-05T12:00:00', { title: '콘서트 가요' });
    const oneSooner = await questAt('2092-01-05T11:00:00', { title: '모임', description: '버스킹 보러 가요' });
    const both = await questAt('2092-01-05T13:00:00', { title: '콘서트', description: '버스킹도 봐요' });

    expect(await questsFound({ ...day, words: ['콘서트', '버스킹'] })).toEqual([both, oneSooner, oneLater, neither]);
    expect(await questsFound(day)).toEqual([neither, oneSooner, oneLater, both]);
  });

  it('goes by title in code points, whatever the database, when words and start tie', async () => {
    const hangul = await questAt('2092-01-06T09:00:00', { title: '가나다' });
    const lower = await questAt('2092-01-06T09:00:00', { title: 'apple' });
    const upper = await questAt('2092-01-06T09:00:00', { title: 'Zebra' });

    expect(await questsFound({ from: '2092-01-06', to: '2092-01-06', words: ['없는 말'] })).toEqual([
      upper,
      lower,
      hangul,
    ]);
  });
});

describe('searchRecruitingQuests, reading a word', () => {
  it('ignores the case of a word', async () => {
    const other = await questAt('2092-01-07T09:00:00', { title: '모임' });
    const held = await questAt('2092-01-07T10:00:00', { title: 'K-POP 커버' });

    expect(await questsFound({ from: '2092-01-07', to: '2092-01-07', words: ['k-pop'] })).toEqual([held, other]);
  });

  it.each([
    ['%', '2092-01-08', '할인 100%', '할인 1000'],
    ['_', '2092-01-09', 'snake_case', 'snakeXcase'],
    ['a backslash', '2092-01-10', String.raw`a\b`, 'ab'],
  ])('reads %s in a word as itself', async (_, date, held, lookAlike) => {
    const other = await questAt(`${date}T09:00:00`, { title: lookAlike });
    const found = await questAt(`${date}T10:00:00`, { title: held });
    const word = { '할인 100%': '100%', snake_case: 'e_c' }[held] ?? String.raw`a\b`;

    expect(await questsFound({ from: date, to: date, words: [word] })).toEqual([found, other]);
  });
});

describe('searchRecruitingQuests, counting and cutting', () => {
  it('counts a word given twice once', async () => {
    const other = await questAt('2092-01-11T09:00:00', { title: '버스킹' });
    const held = await questAt('2092-01-11T10:00:00', { title: 'Concert' });

    expect(
      await questsFound({ from: '2092-01-11', to: '2092-01-11', words: ['concert', 'CONCERT', '버스킹'] }),
    ).toEqual([other, held]);
  });

  it('brings in a Quest past those that fill the list, by a word beyond the cut of its description', async () => {
    await Promise.all(Array.from({ length: 31 }, () => questAt('2092-01-12T09:00:00')));
    const held = await questAt('2092-01-12T18:00:00', { description: `${'가'.repeat(160)} 콘서트` });

    const { more, candidates } = await search('searchRecruitingQuests', {
      from: '2092-01-12',
      to: '2092-01-12',
      words: ['콘서트'],
    });

    expect(candidates).toHaveLength(30);
    expect(candidates[0]?.id).toBe(held);
    expect(more).toBe(true);
  });

  it('takes ten words and refuses more, back to the model', async () => {
    const quest = await questAt('2092-01-13T09:00:00');
    const words = Array.from({ length: 10 }, (_, index) => `말${index}`);

    expect(await questsFound({ from: '2092-01-13', to: '2092-01-13', words })).toEqual([quest]);

    model.script({ tool: 'searchRecruitingQuests', input: { words: [...words, '하나 더'] } }, { text: '…' });
    await postAssistantMessages(app, reader.accessToken, ask('있어?'));

    expect(JSON.stringify(model.received().at(-1)?.prompt)).toContain('too_big');
  });
});

describe('searchRecruitingQuests, at its limits', () => {
  it('gives 30 candidates when 30 fit, saying there are no more, with descriptions cut at 150 characters', async () => {
    const description = '가'.repeat(151);
    await Promise.all(Array.from({ length: 30 }, () => questAt('2092-02-05T09:00:00', { description })));

    const { more, candidates } = await search('searchRecruitingQuests', { from: '2092-02-05', to: '2092-02-05' });

    expect(candidates).toHaveLength(30);
    expect(more).toBe(false);
    expect(candidates[0]?.description).toBe(`<data label="quest.description">${'가'.repeat(150)}</data>`);
  });
});

describe('searchGlobalEvents, given words', () => {
  const day = { from: '2092-03-05', to: '2092-03-05' };

  it('puts those holding more of the words first, ties in start order, and fills the rest of the window', async () => {
    const neither = await eventAt('2092-03-05T09:00:00', { title: '북토크' });
    const oneLater = await eventAt('2092-03-05T12:00:00', { title: '재즈 콘서트' });
    const oneSooner = await eventAt('2092-03-05T11:00:00', { title: '축제', description: '버스킹이 있어요' });
    const both = await eventAt('2092-03-05T13:00:00', { title: '콘서트', description: '버스킹도 있어요' });

    expect(await eventsFound({ ...day, words: ['콘서트', '버스킹'] })).toEqual([
      both.id,
      oneSooner.id,
      oneLater.id,
      neither.id,
    ]);
    expect(await eventsFound(day)).toEqual([neither.id, oneSooner.id, oneLater.id, both.id]);
  });

  it('goes by title in code points when words and start tie', async () => {
    const hangul = await eventAt('2092-03-06T09:00:00', { title: '가나다' });
    const lower = await eventAt('2092-03-06T09:00:00', { title: 'apple' });
    const upper = await eventAt('2092-03-06T09:00:00', { title: 'Zebra' });

    expect(await eventsFound({ from: '2092-03-06', to: '2092-03-06' })).toEqual([upper.id, lower.id, hangul.id]);
  });

  it('ignores case and reads %, _ and a backslash in a word as themselves', async () => {
    const other = await eventAt('2092-03-07T09:00:00', { title: '할인 1000' });
    const held = await eventAt('2092-03-07T10:00:00', { title: 'SALE 100%' });

    expect(await eventsFound({ from: '2092-03-07', to: '2092-03-07', words: ['sale 100%'] })).toEqual([
      held.id,
      other.id,
    ]);
  });
});

describe('searchGlobalEvents, with its place and at its limits', () => {
  it('still keeps only the events at the place asked for', async () => {
    const there = await eventAt('2092-03-08T09:00:00', { title: '북토크', place: '문화관(73동) 대강당' });
    const held = await eventAt('2092-03-08T10:00:00', { title: '콘서트', place: '문화관(73동) 대강당' });
    await eventAt('2092-03-08T11:00:00', { title: '콘서트', place: '학생회관' });

    expect(await eventsFound({ from: '2092-03-08', to: '2092-03-08', place: '73동', words: ['콘서트'] })).toEqual([
      held.id,
      there.id,
    ]);
  });

  it('brings in an event past those that fill the list, saying there are more', async () => {
    await Promise.all(Array.from({ length: 31 }, () => eventAt('2092-03-09T09:00:00')));
    const held = await eventAt('2092-03-09T18:00:00', { title: '콘서트' });

    const { more, candidates } = await search('searchGlobalEvents', {
      from: '2092-03-09',
      to: '2092-03-09',
      words: ['콘서트'],
    });

    expect(candidates).toHaveLength(30);
    expect(candidates[0]?.id).toBe(held.id);
    expect(more).toBe(true);
  });

  it('gives 30 candidates when 30 fit, with descriptions cut at 150 characters', async () => {
    const description = '가'.repeat(151);
    await Promise.all(Array.from({ length: 30 }, () => eventAt('2092-03-10T09:00:00', { description })));

    const { more, candidates } = await search('searchGlobalEvents', { from: '2092-03-10', to: '2092-03-10' });

    expect(candidates).toHaveLength(30);
    expect(more).toBe(false);
    expect(candidates[0]?.description).toBe(`<data label="globalEvent.description">${'가'.repeat(150)}</data>`);
  });
});
