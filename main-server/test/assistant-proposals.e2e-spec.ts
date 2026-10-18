/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { type QuestProposal } from '../src/assistant/proposal.js';
import { ask, postAssistantMessages } from './assistant.js';
import { signInUser, TestUser } from './friends.js';
import { connectToDatabase, getQuests } from './quests.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';
import { refuseMatchServer } from './match-server.js';

// The chat Assistant's proposeQuest, with the scripted model in the model's place. The app's clock stands at a
// morning of 2096, which no other file uses, so that a start before it is in the past, and every title is this file's.

let app: INestApplication<Server>;
let prisma: PrismaClient;
let user: TestUser;
const model = new ScriptedModel();

// 2096-05-07 09:00 in Korea.
const NOW = new Date('2096-05-07T00:00:00Z');

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, refuseMatchServer, model.model);
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(NOW);
  prisma = connectToDatabase();
  user = await signInUser(app);
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

// A complete Open Proposal on the meal Board, for the next day's lunch.
const LUNCH: QuestProposal = {
  title: '2096 학식 같이 먹어요',
  description: '내일 점심 학식 같이 먹을 사람 모집해요',
  joinPolicy: 'open',
  board: 'meal',
  capacity: 4,
  startsAt: '2096-05-08T12:00:00+09:00',
};

// LUNCH with `changes` applied.
function lunch(changes: object = {}): object {
  return { ...LUNCH, ...changes };
}

// The model proposes `proposal`, then answers.
function scriptProposal(proposal: object): void {
  model.script({ tool: 'proposeQuest', input: proposal }, { text: '만들기를 누르면 파티가 만들어져요.' });
}

function send(messages: readonly object[]): Promise<{ status: number; body: unknown }> {
  return postAssistantMessages(app, user.accessToken, messages);
}

// The fields proposeQuest refused, with why, as the model received them.
function refused(): Record<string, string> {
  const results = z.array(z.object({ result: z.literal('refused'), fields: z.record(z.string(), z.string()) }));
  const [result] = results.parse(model.toolResults());
  return result?.fields ?? {};
}

function refusedFields(): string[] {
  return Object.keys(refused());
}

describe('proposeQuest, with a complete Open Proposal', () => {
  it('adds the Proposal to the reply, its start in Korea time', async () => {
    scriptProposal(lunch({ startsAt: '2096-05-08T03:00:00Z' }));

    const response = await send(ask('내일 점심에 학식 같이 먹을 사람 4명 모집해줘, 식사 게시판에'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      text: '만들기를 누르면 파티가 만들어져요.',
      mapButtons: [],
      cards: [],
      proposal: LUNCH,
    });
    expect(model.toolResults()).toEqual([{ result: 'proposed', proposal: LUNCH }]);
  });

  it('takes an Approval Quest', async () => {
    scriptProposal(lunch({ joinPolicy: 'approval' }));

    const response = await send(ask('승인 후 참여로 해줘'));

    expect(response.body).toMatchObject({ proposal: lunch({ joinPolicy: 'approval' }) });
  });

  it('keeps the last Proposal when the model proposes twice', async () => {
    model.script(
      { tool: 'proposeQuest', input: lunch() },
      { tool: 'proposeQuest', input: lunch({ capacity: 3 }) },
      { text: '…' },
    );

    const response = await send(ask('3명으로 해줘'));

    expect(response.body).toMatchObject({ proposal: lunch({ capacity: 3 }) });
  });
});

describe('proposeQuest, refusing a field', () => {
  it('refuses an Open Proposal without a Board, on that field', async () => {
    scriptProposal(lunch({ board: undefined }));

    const response = await send(ask('점심 같이 먹을 사람 모집해줘'));

    expect(refusedFields()).toEqual(['board']);
    expect(response.body).toMatchObject({ proposal: null });
  });

  it.each([undefined, '', '   '])('refuses an Open Proposal with the description %j, on that field', async (text) => {
    scriptProposal(lunch({ description: text }));

    const response = await send(ask('점심 같이 먹을 사람 모집해줘'));

    expect(refusedFields()).toEqual(['description']);
    expect(response.body).toMatchObject({ proposal: null });
  });

  it.each([0, 9, 2.5])("refuses the capacity %j, outside the main server's rules", async (capacity) => {
    scriptProposal(lunch({ capacity }));

    const response = await send(ask('점심 같이 먹을 사람 모집해줘'));

    expect(refusedFields()).toEqual(['capacity']);
    expect(response.body).toMatchObject({ proposal: null });
  });
});

describe('proposeQuest, refusing a time or a length', () => {
  it.each(['2096-05-07T08:00:00+09:00', '2096-05-07T09:00:00+09:00', '2001-01-01T12:00:00+09:00'])(
    'refuses a start in the past, %s',
    async (startsAt) => {
      scriptProposal(lunch({ startsAt }));

      const response = await send(ask('오늘 아침 같이 먹을 사람 모집해줘'));

      expect(refusedFields()).toEqual(['startsAt']);
      expect(refused().startsAt).toContain('In the past');
      expect(response.body).toMatchObject({ proposal: null });
    },
  );

  it('refuses a start without its offset, and names every field that is missing', async () => {
    scriptProposal({ title: '2096 같이 걸어요', startsAt: '2096-05-08T12:00:00' });

    await send(ask('같이 걸을 사람'));

    expect(refusedFields().toSorted()).toEqual(['board', 'capacity', 'description', 'joinPolicy', 'startsAt']);
  });

  it('refuses a title over the length the main server allows', async () => {
    scriptProposal(lunch({ title: '가'.repeat(51) }));

    await send(ask('점심 같이 먹을 사람 모집해줘'));

    expect(refusedFields()).toEqual(['title']);
  });
});

describe('a Proposal over several messages', () => {
  const first = { role: 'user', text: '내일 점심에 학식 같이 먹을 사람 4명 모집해줘, 식사 게시판에' };
  const proposed = { role: 'assistant', text: '만들기를 누르면 파티가 만들어져요.', cards: [], proposal: LUNCH };
  const last = { role: 'user', text: '시간만 1시로' };
  const earlier = [first, proposed, last];

  it("gives the model the last Proposal's values, which it changes in one field", async () => {
    scriptProposal(lunch({ startsAt: '2096-05-08T13:00:00+09:00' }));

    const response = await send(earlier);

    const assistant = model.received()[0]?.prompt.find(({ role }) => role === 'assistant');
    const said = assistant?.role === 'assistant' ? assistant.content.map((part) => JSON.stringify(part)).join('') : '';
    for (const value of Object.values(LUNCH)) {
      expect(said).toContain(String(value));
    }
    expect(response.body).toMatchObject({ proposal: lunch({ startsAt: '2096-05-08T13:00:00+09:00' }) });
  });

  it('checks a Proposal sent back again, and refuses it once it starts in the past', async () => {
    scriptProposal(lunch({ startsAt: '2096-05-07T08:00:00+09:00' }));

    await send(earlier);

    expect(refusedFields()).toEqual(['startsAt']);
  });

  it('refuses with 400, before the model is called, a request that sends two Proposals back', async () => {
    model.script();

    const response = await send([first, proposed, first, proposed, last]);

    expect(response.status).toBe(400);
    expect(model.received()).toEqual([]);
  });

  it('refuses with 400 a Proposal of another shape', async () => {
    model.script();

    const response = await send([first, { ...proposed, proposal: lunch({ joinPolicy: 'closed' }) }, last]);

    expect(response.status).toBe(400);
  });
});

// 24,000 characters together, the most a request may hold, the Proposal's text left out.
function atTheLimit(proposal: object | null): object[] {
  const pair = [
    { role: 'user', text: '가'.repeat(1000) },
    { role: 'assistant', text: '나'.repeat(4000) },
  ];
  return [
    ...pair,
    ...pair,
    ...pair,
    ...pair,
    { role: 'assistant', text: '다'.repeat(3990), cards: [], proposal },
    { role: 'user', text: '라'.repeat(10) },
  ];
}

describe("a Proposal's length", () => {
  it("counts its title and description in the request's length", async () => {
    model.script({ text: '…' });
    expect((await send(atTheLimit(null))).status).toBe(200);

    model.script();
    expect((await send(atTheLimit(LUNCH))).status).toBe(400);
  });
});

describe('proposing', () => {
  it('makes nothing', async () => {
    const title = '2096 아무것도 만들지 않는 파티';
    const before = await prisma.quest.count({ where: { title } });
    scriptProposal(lunch({ title }));

    const response = await send(ask('파티 만들어줘'));

    expect(response.body).toMatchObject({ proposal: lunch({ title }) });
    expect(await prisma.quest.count({ where: { title } })).toBe(before);
    expect((await getQuests(app, user)).body).toEqual([]);
  });
});
