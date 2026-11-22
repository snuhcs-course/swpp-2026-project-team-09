/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { type QuestProposal } from '../src/assistant/proposal.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { postAssistantMessages } from './assistant.js';
import { befriend, signInUser, TestUser } from './friends.js';
import { answerInvitation, handOver, invitationOf, joinRequestOf } from './quest-recruiting.js';
import { connectToDatabase, dropQuest, joinQuest, makeQuest } from './quests.js';
import { ScriptedModel } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// A 파티 the User made with 만들기, changed in place from the Assistant (P05 ticket 30; rows 30 to 38 of ticket 17's
// case table for a made 파티). For an app that says `party-change`, proposeQuest shows a change of its time or place as
// a card whose 바꾸기 sends the step to the room's 일정 수정, which keeps everyone who is in. The rest of it is changed
// in its room, and one gone, led by another, or started is not changed.

let app: INestApplication<Server>;
let prisma: PrismaClient;
let leader: TestUser;
let minsu: TestUser;
let jieun: TestUser;
let place301: string;
const model = new ScriptedModel();

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, model.model);
  // 2096-05-07 09:00 in Korea.
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(new Date('2096-05-07T00:00:00Z'));
  prisma = connectToDatabase();
  [leader, minsu, jieun] = [await signInUser(app), await signInUser(app), await signInUser(app)];
  await befriend(app, leader, minsu);
  await befriend(app, leader, jieun);
  place301 = (await prisma.place.findFirstOrThrow({ where: { number: '301' } })).id;
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

const LUNCH: QuestProposal = {
  title: '2096 학식 같이 먹어요',
  description: '내일 점심 학식 같이 먹을 사람 모집해요',
  joinPolicy: 'open',
  board: 'meal',
  capacity: 4,
  startsAt: '2096-05-08T12:00:00+09:00',
  place: null,
  globalEvent: null,
  invitees: [],
};

// Makes the Proposal as 만들기 does, and answers the Quest's id.
async function made(proposal: QuestProposal): Promise<string> {
  const { title, description, joinPolicy, board, capacity, startsAt, invitees } = proposal;
  const response = await makeQuest(app, leader, {
    title,
    subQuest: { title, startsAt },
    capacity,
    joinPolicy,
    ...(board === null ? {} : { board, description }),
  });
  const { id } = z.object({ id: z.string() }).parse(response.body);
  for (const { id: userId } of invitees) {
    // oxlint-disable-next-line no-await-in-loop -- one invitation at a time, as the party form sends them
    await invitationOf(app, leader, id, userId === minsu.id ? minsu : jieun);
  }
  return id;
}

// The conversation after 만들기, the User asking for a change in their last message.
function afterMaking(proposal: QuestProposal, questId: string, asked = '방금 만든 파티 시간 바꿔줘'): object[] {
  return [
    { role: 'user', text: '파티 만들어줘' },
    {
      role: 'assistant',
      text: '만들기를 누르면 파티가 만들어져요.',
      cards: [],
      proposal: { ...proposal, madeQuestId: questId },
    },
    { role: 'user', text: asked },
  ];
}

function ask(proposal: QuestProposal, questId: string, given: object): request.Test {
  model.script({ tool: 'proposeQuest', input: given }, { text: '…' });
  return postAssistantMessages(app, leader.accessToken, afterMaking(proposal, questId), {
    clientCapabilities: ['party-change'],
  });
}

const changeOf = z.object({
  proposal: z.object({
    change: z.object({ questId: z.string(), subQuestId: z.string(), step: z.object({}).loose(), told: z.number() }),
  }),
});

// Presses 바꾸기: the step goes to the room's 일정 수정 as it is.
function pressChange(body: unknown): request.Test {
  const { change } = changeOf.parse(body).proposal;
  return withAccessToken(
    request(app.getHttpServer()).put(`/quests/${change.questId}/sub-quests/${change.subQuestId}`),
    leader.accessToken,
  ).send(change.step);
}

function stepOf(questId: string): Promise<{ startsAt: Date | null; placeId: string | null }> {
  return prisma.subQuest.findFirstOrThrow({ where: { questId }, select: { startsAt: true, placeId: true } });
}

describe('A made 파티 asked to start at another time', () => {
  it('with nobody else in it, is shown as a change, not a clash with itself, and 바꾸기 moves it in place (row 30)', async () => {
    const questId = await made(LUNCH);
    const atTwenty = { ...LUNCH, startsAt: '2096-05-08T12:20:00+09:00' };

    const response = await ask(LUNCH, questId, atTwenty);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ proposal: { ...atTwenty, change: { questId, told: 0 } } });
    expect(model.toolResults()).toEqual([
      expect.objectContaining({ result: 'change-shown', told: 0, waiting: 0, reason: expect.any(String) as unknown }),
    ]);
    expect(model.toolResults()[0]).not.toHaveProperty('clashes');
    expect((await pressChange(response.body)).status).toBe(200);
    expect(await stepOf(questId)).toEqual({ startsAt: new Date('2096-05-08T03:20:00Z'), placeId: null });
    expect(await prisma.quest.count({ where: { leaderId: leader.id, title: LUNCH.title } })).toBe(1);
  });

  it('with others who joined, counts them as told, and 바꾸기 keeps them in (row 31)', async () => {
    const questId = await made(LUNCH);
    await joinQuest(app, minsu, questId);

    const response = await ask(LUNCH, questId, { ...LUNCH, startsAt: '2096-05-08T13:00:00+09:00' });

    expect(response.body).toMatchObject({ proposal: { change: { told: 1 } } });
    expect(model.toolResults()).toEqual([expect.objectContaining({ result: 'change-shown', told: 1, waiting: 0 })]);
    expect((await pressChange(response.body)).status).toBe(200);
    expect(await prisma.questHolder.count({ where: { questId, userId: minsu.id } })).toBe(1);
  });
});

describe('A made 파티 asked to start at another time, with others waiting', () => {
  it('with join requests waiting, leaves them waiting and untold (row 32)', async () => {
    const questId = await made({ ...LUNCH, joinPolicy: 'approval' });
    await joinRequestOf(app, minsu, questId);

    const response = await ask({ ...LUNCH, joinPolicy: 'approval' }, questId, {
      ...LUNCH,
      joinPolicy: 'approval',
      startsAt: '2096-05-08T13:00:00+09:00',
    });

    expect(model.toolResults()).toEqual([expect.objectContaining({ result: 'change-shown', told: 0, waiting: 0 })]);
    expect((await pressChange(response.body)).status).toBe(200);
    expect(await prisma.questJoinRequest.count({ where: { questId, userId: minsu.id } })).toBe(1);
  });

  it('closed, tells the Friend who accepted, and the one who has not answered stays invited (row 33)', async () => {
    const closed: QuestProposal = {
      ...LUNCH,
      joinPolicy: 'closed',
      board: null,
      description: '',
      invitees: [
        { id: minsu.id, name: '민수' },
        { id: jieun.id, name: '지은' },
      ],
    };
    const questId = await made(closed);
    const [invitation] = await prisma.questInvitation.findMany({ where: { questId, userId: minsu.id } });
    await answerInvitation(app, minsu, invitation?.id ?? '', 'accept');

    const response = await ask(closed, questId, {
      title: closed.title,
      joinPolicy: 'closed',
      capacity: closed.capacity,
      inviteeIds: [minsu.id, jieun.id],
      startsAt: '2096-05-08T13:00:00+09:00',
    });

    expect(model.toolResults()).toEqual([expect.objectContaining({ result: 'change-shown', told: 1, waiting: 1 })]);
    expect((await pressChange(response.body)).status).toBe(200);
    expect(await prisma.questInvitation.count({ where: { questId, userId: jieun.id } })).toBe(1);
  });
});

describe('A made 파티 asked to meet elsewhere', () => {
  it('is shown as a change of its place, its time kept', async () => {
    const questId = await made(LUNCH);
    model.script(
      { tool: 'resolvePlace', input: { words: '301동' } },
      { tool: 'proposeQuest', input: { ...LUNCH, placeId: place301 } },
      { text: '…' },
    );

    const response = await postAssistantMessages(app, leader.accessToken, afterMaking(LUNCH, questId, '301동으로'), {
      clientCapabilities: ['party-change'],
    });

    expect(response.body).toMatchObject({
      proposal: {
        startsAt: LUNCH.startsAt,
        place: { id: place301 },
        change: { step: { place: { placeId: place301 } } },
      },
    });
    expect((await pressChange(response.body)).status).toBe(200);
    expect(await stepOf(questId)).toEqual({ startsAt: new Date('2096-05-08T03:00:00Z'), placeId: place301 });
  });
});

describe('A made 파티 not changed here', () => {
  it('asked for another capacity, is changed in its room, whose 수정 a button opens (row 34)', async () => {
    const questId = await made(LUNCH);

    const response = await ask(LUNCH, questId, { ...LUNCH, capacity: 6 });

    expect(response.body).toMatchObject({
      proposal: null,
      offers: [{ kind: 'quest', label: '파티 수정하기', questId }],
    });
    expect(model.toolResults()).toEqual([expect.objectContaining({ result: 'in-room', questId })]);
  });

  it('once started, is not changed (row 35)', async () => {
    const questId = await made(LUNCH);
    await prisma.subQuest.updateMany({ where: { questId }, data: { startsAt: new Date('2096-05-06T23:30:00Z') } });

    const response = await ask(LUNCH, questId, { ...LUNCH, startsAt: '2096-05-08T13:00:00+09:00' });

    expect(response.body).toMatchObject({ proposal: null });
    expect(model.toolResults()).toEqual([expect.objectContaining({ result: 'started', questId })]);
  });
});

describe('A made 파티 no longer the User’s to change', () => {
  it('once gone, is not changed and may be proposed again (row 36)', async () => {
    const questId = await made(LUNCH);
    await dropQuest(app, leader, questId);

    const response = await ask(LUNCH, questId, { ...LUNCH, startsAt: '2096-05-08T13:00:00+09:00' });

    expect(response.body).toMatchObject({ proposal: null });
    expect(model.toolResults()).toEqual([expect.objectContaining({ result: 'gone', questId })]);
  });

  it('once handed over, is left to its Leader (row 37)', async () => {
    const questId = await made(LUNCH);
    await joinQuest(app, minsu, questId);
    await handOver(app, leader, questId, minsu.id);

    const response = await ask(LUNCH, questId, { ...LUNCH, startsAt: '2096-05-08T13:00:00+09:00' });

    const { name } = await prisma.user.findUniqueOrThrow({ where: { id: minsu.id } });
    expect(response.body).toMatchObject({ proposal: null });
    expect(model.toolResults()).toEqual([
      expect.objectContaining({ result: 'led-by-other', leader: expect.stringContaining(name) as unknown }),
    ]);
  });

  it('for an app that draws no change, is said to be posted, as before', async () => {
    const questId = await made(LUNCH);
    model.script({ tool: 'proposeQuest', input: { ...LUNCH, startsAt: '2096-05-08T13:00:00+09:00' } }, { text: '…' });

    const response = await postAssistantMessages(app, leader.accessToken, afterMaking(LUNCH, questId));

    expect(response.body).toMatchObject({ proposal: null });
    expect(model.toolResults()).toEqual([expect.objectContaining({ result: 'made', questId })]);
  });
});

describe('A change shown and not pressed, sent back', () => {
  it('is read as a change of the made 파티, which is changed again from it', async () => {
    const questId = await made(LUNCH);
    const shown = await ask(LUNCH, questId, { ...LUNCH, startsAt: '2096-05-08T13:00:00+09:00' });
    const { proposal } = z.object({ proposal: z.object({}).loose() }).parse(shown.body);
    model.script({ tool: 'proposeQuest', input: { ...LUNCH, startsAt: '2096-05-08T14:00:00+09:00' } }, { text: '…' });

    const response = await postAssistantMessages(
      app,
      leader.accessToken,
      [
        { role: 'user', text: '파티 만들어줘' },
        { role: 'assistant', text: '바꾸기를 누르면 바뀌어요.', cards: [], proposal },
        { role: 'user', text: '아니 2시로' },
      ],
      { clientCapabilities: ['party-change'] },
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ proposal: { startsAt: '2096-05-08T14:00:00+09:00', change: { questId } } });
    const said = JSON.stringify(model.received()[0]?.prompt.find(({ role }) => role === 'assistant'));
    expect(said).toContain('[Proposal change shown: ');
  });
});
