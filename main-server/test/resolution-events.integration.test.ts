/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication, Logger } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { GlobalEvent, PrismaClient, ResolutionEvent } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { ask, postAssistantMessages } from './assistant.js';
import { befriend, signInUser, TestUser } from './friends.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';
import { refuseMatchServer } from './match-server.js';

// The rows of resolution_events the Assistant writes (P07 ticket 02), with the scripted model in the model's place.
// The app's clock stands in May 2093, which no other file uses, and the Friend's name and the event's title are this
// file's own. The seed's Places are shared, and only read.

let app: INestApplication<Server>;
let prisma: PrismaClient;
let user: TestUser;
let friend: TestUser;
let festival: GlobalEvent;
let studentCentre: string;
let place301: string;
const model = new ScriptedModel();

// 2093-05-01 09:00 in Korea.
const NOW = new Date('2093-05-01T00:00:00Z');

function named(name: string): Promise<TestUser> {
  return signInUser(app, { name, department: '컴퓨터공학부' });
}

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, refuseMatchServer, model.model);
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(NOW);
  prisma = connectToDatabase();
  [user, friend] = await Promise.all([named('홍길동'), named('삼사가람')]);
  await befriend(app, user, friend);
  studentCentre = (await prisma.place.findFirstOrThrow({ where: { name: '학생회관' } })).id;
  place301 = (await prisma.place.findFirstOrThrow({ where: { number: '301' } })).id;
  const startsAt = new Date('2093-05-10T18:00:00+09:00');
  festival = await storeEvent(prisma, {
    title: '2093 오월 축제',
    startsAt,
    endsAt: new Date(startsAt.getTime() + 3 * 60 * 60 * 1000),
  });
});

// A choice also teaches the User an alias (P07 ticket 03), which would answer the next test's words.
beforeEach(async () => {
  await prisma.resolutionEvent.deleteMany({ where: { userId: user.id } });
  await prisma.userAlias.deleteMany({ where: { userId: user.id } });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(NOW);
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

function send(messages: readonly object[]): Promise<{ status: number; body: unknown }> {
  return postAssistantMessages(app, user.accessToken, messages);
}

function rowsOf(userId: string): Promise<ResolutionEvent[]> {
  return prisma.resolutionEvent.findMany({ where: { userId } });
}

function rowOf(rows: readonly ResolutionEvent[], words: string): ResolutionEvent | undefined {
  return rows.find((row) => row.words === words);
}

const answerSchema = z.union([
  z.object({ result: z.literal('one'), candidate: z.object({ id: z.string() }).loose() }),
  z.object({ result: z.literal('several'), candidates: z.array(z.object({ id: z.string() }).loose()) }),
  z.object({ result: z.literal('none') }),
]);

// The ids a resolver's answer gave the model, in order.
function idsOf(answer: unknown): string[] {
  const parsed = answerSchema.parse(answer);
  if (parsed.result === 'one') {
    return [parsed.candidate.id];
  }
  return parsed.result === 'several' ? parsed.candidates.map(({ id }) => id) : [];
}

describe('answered rows', () => {
  it('records one row per resolver call, by the normalised words, with the tier and the candidates', async () => {
    model.script(
      { tool: 'resolvePlace', input: { words: '학 관' } },
      { tool: 'resolvePlace', input: { words: '공대' } },
      { tool: 'resolveFriend', input: { name: '삼사가람' } },
      { tool: 'resolveGlobalEvent', input: { words: '2093 오월' } },
      { tool: 'resolvePlace', input: { words: '없는건물' } },
      { text: '…' },
    );

    await send(ask('학 관이랑 공대 중에 삼사가람이 좋아하는 데서 2093 오월 축제 전에 모이자'));

    const [hakgwan, gongdae, garam, may] = model.toolResults();
    const rows = await rowsOf(user.id);
    expect(rows).toHaveLength(5);
    const answeredRow = { outcome: 'answered', chosenId: null };
    expect(rowOf(rows, '학관')).toMatchObject({
      ...answeredRow,
      kind: 'place',
      choseong: 'ㅎㄱ',
      result: 'several',
      tier: 'generated',
      aliasSource: null,
      candidateIds: idsOf(hakgwan),
    });
    expect(rowOf(rows, '공대')).toMatchObject({ result: 'several', tier: 'alias', aliasSource: 'curated' });
    expect(rowOf(rows, '공대')?.candidateIds).toEqual(idsOf(gongdae));
    expect(rowOf(rows, '삼사가람')).toMatchObject({
      ...answeredRow,
      kind: 'friend',
      choseong: 'ㅅㅅㄱㄹ',
      result: 'one',
      tier: null,
      candidateIds: idsOf(garam),
    });
    expect(idsOf(may)).toEqual([festival.id]);
    expect(rowOf(rows, '2093오월')).toMatchObject({ kind: 'globalEvent', choseong: null, candidateIds: [festival.id] });
    expect(rowOf(rows, '없는건물')).toMatchObject({ result: 'none', tier: null, candidateIds: [] });
  });

  it('stores no sentence', async () => {
    model.script({ tool: 'resolvePlace', input: { words: '학관' } }, { text: '…' });

    await send(ask('학관에서 내일 점심 먹을 사람'));

    expect(JSON.stringify(await rowsOf(user.id))).not.toContain('점심');
  });
});

// The User's answer to the question which 학관, tapped from its chips.
function choosing(id: string): object[] {
  return [
    { role: 'user', text: '학관에서 보자' },
    { role: 'assistant', text: '어느 학관이요?' },
    { role: 'user', text: '학생회관', chosen: { kind: 'place', id, words: '학 관' } },
  ];
}

describe('chosen rows', () => {
  it('records a row for a choice that passes the check', async () => {
    model.script({ text: '…' });

    await send(choosing(studentCentre));

    expect(await rowsOf(user.id)).toEqual([
      expect.objectContaining({
        kind: 'place',
        words: '학관',
        choseong: 'ㅎㄱ',
        result: null,
        tier: null,
        candidateIds: [],
        chosenId: studentCentre,
        outcome: 'chosen',
      }),
    ]);
  });

  it('records no second row when the conversation is sent again with the choice on an earlier message', async () => {
    model.script({ text: '…' });
    await send(choosing(studentCentre));
    model.script({ text: '…' });

    await send([...choosing(studentCentre), { role: 'assistant', text: '몇 명이요?' }, { role: 'user', text: '4명' }]);

    expect(await rowsOf(user.id)).toHaveLength(1);
  });

  it('records nothing for a choice that fails the check', async () => {
    model.script({ text: '…' });

    await send(choosing(friend.id));

    expect(await rowsOf(user.id)).toEqual([]);
  });
});

// A complete Open Proposal on the meal Board, for the next day's lunch, without its Place.
const LUNCH = {
  title: '2093 점심',
  description: '점심 같이 먹어요',
  joinPolicy: 'open',
  board: 'meal',
  capacity: 4,
  startsAt: '2093-05-02T12:00:00+09:00',
} as const;

// The conversation with a Proposal at 제1공학관 sent back, and the User's new message.
function afterProposal(text: string): object[] {
  return [
    { role: 'user', text: '내일 점심 4명 모집해줘' },
    {
      role: 'assistant',
      text: '만들기를 눌러 주세요.',
      cards: [],
      proposal: { ...LUNCH, place: { id: place301, name: '제1공학관' }, globalEvent: null, invitees: [] },
    },
    { role: 'user', text },
  ];
}

describe('edited rows', () => {
  it("records the Place a Proposal's was changed to, for the words last resolved to a Place", async () => {
    model.script(
      { tool: 'resolvePlace', input: { words: '학관' } },
      { tool: 'proposeQuest', input: { ...LUNCH, placeId: studentCentre } },
      { text: '…' },
    );

    const response = await send(afterProposal('장소만 학관으로'));

    expect(response.body).toMatchObject({ proposal: { place: { id: studentCentre } } });
    const rows = await rowsOf(user.id);
    expect(rows.filter(({ outcome }) => outcome === 'edited')).toEqual([
      expect.objectContaining({
        kind: 'place',
        words: '학관',
        choseong: 'ㅎㄱ',
        result: null,
        candidateIds: [place301],
        chosenId: studentCentre,
      }),
    ]);
  });

  it('records none when the Place stays', async () => {
    model.script({ tool: 'proposeQuest', input: { ...LUNCH, capacity: 3, placeId: place301 } }, { text: '…' });

    const response = await send(afterProposal('3명으로'));

    expect(response.body).toMatchObject({ proposal: { capacity: 3 } });
    expect(await rowsOf(user.id)).toEqual([]);
  });
});

describe('a row that cannot be written', () => {
  it('leaves the answer as it is, and the log names the cause without the words', async () => {
    // Imported after startApp, so that it is the class the server registered.
    const { PrismaService } = await import('../src/common/prisma.service.js');
    vi.spyOn(app.get(PrismaService).resolutionEvent, 'create').mockRejectedValue(new Error('학관 was not written'));
    const warn = vi.spyOn(Logger.prototype, 'warn');
    model.script({ tool: 'resolvePlace', input: { words: '학관' } }, { text: '어느 학관이요?' });

    const response = await send(ask('학관'));

    expect(response.status).toBe(200);
    expect(model.toolResults()).toEqual([expect.objectContaining({ result: 'several' })]);
    expect(response.body).toMatchObject({ choices: expect.arrayContaining([expect.anything()]) as unknown });
    expect(await rowsOf(user.id)).toEqual([]);
    const logged = warn.mock.calls.flat().join('\n');
    expect(logged).toContain('A resolution event was not recorded: Error');
    expect(logged).not.toContain('학관');
  });
});

describe('rows of an account', () => {
  it('go with it', async () => {
    const leaving = await named('삼사떠남');
    model.script({ tool: 'resolvePlace', input: { words: '학관' } }, { text: '…' });
    await postAssistantMessages(app, leaving.accessToken, ask('학관'));
    expect(await rowsOf(leaving.id)).toHaveLength(1);

    // What signing in made, which the account does not take with it.
    await prisma.refreshToken.deleteMany({ where: { session: { userId: leaving.id } } });
    await prisma.session.deleteMany({ where: { userId: leaving.id } });
    await prisma.user.delete({ where: { id: leaving.id } });

    expect(await rowsOf(leaving.id)).toEqual([]);
  });
});
