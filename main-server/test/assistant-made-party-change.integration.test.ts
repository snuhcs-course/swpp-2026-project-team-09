/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type INestApplication } from '@nestjs/common';
import { type Server } from 'node:http';
import { z } from 'zod';
import { type QuestProposal } from '../src/assistant/proposal.js';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { postAssistantMessages } from './assistant.js';
import { type TestUser } from './friends.js';
import { LUNCH, MadePartyStage } from './made-party.js';
import { answerInvitation, handOver, joinRequestOf } from './quest-recruiting.js';
import { dropQuest, joinQuest } from './quests.js';

// A 파티 the User made with 만들기, changed in place from the Assistant (P05 ticket 30; rows 30 to 38 of ticket 17's
// case table for a made 파티). For an app that says `party-change`, proposeQuest shows a change of its time or place as
// a card whose 바꾸기 sends the step to the room's 일정 수정, which keeps everyone who is in. The rest of it is changed
// in its room, and one gone, led by another, or started is not changed. A time or a Place the User did not ask to
// change is the step's own, whatever the made Proposal said.

const stage = new MadePartyStage();
const { model, made, afterMaking, ask, pressChange, stepOf, editedInRoom } = stage;
let app: INestApplication<Server>;
let prisma: PrismaClient;
let leader: TestUser;
let minsu: TestUser;
let jieun: TestUser;
let place301: string;
let place302: string;

beforeAll(async () => {
  await stage.start();
  ({ app, prisma, leader, minsu, jieun, place301, place302 } = stage);
});

afterAll(() => stage.stop());

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

describe('A made 파티 changed in its room since', () => {
  it('asked for another time only, keeps the Place it has now, not the made Proposal’s', async () => {
    const at301 = { ...LUNCH, place: { id: place301, name: '301동', booking: null } };
    const questId = await made(at301);
    await editedInRoom(questId, { startsAt: LUNCH.startsAt, place: { placeId: place302 } });

    const response = await ask(at301, questId, {
      ...LUNCH,
      placeId: place301,
      startsAt: '2096-05-08T13:00:00+09:00',
    });

    expect(response.body).toMatchObject({
      proposal: { place: { id: place302 }, change: { step: { place: { placeId: place302 } } } },
    });
    expect((await pressChange(response.body)).status).toBe(200);
    expect(await stepOf(questId)).toEqual({ startsAt: new Date('2096-05-08T04:00:00Z'), placeId: place302 });
  });

  it('asked for another Place only, keeps the time it has now, not the made Proposal’s', async () => {
    const questId = await made(LUNCH);
    await editedInRoom(questId, { startsAt: '2096-05-08T12:30:00+09:00' });
    model.script(
      { tool: 'resolvePlace', input: { words: '301동' } },
      { tool: 'proposeQuest', input: { ...LUNCH, placeId: place301 } },
      { text: '…' },
    );

    const response = await postAssistantMessages(app, leader.accessToken, afterMaking(LUNCH, questId, '301동으로'), {
      clientCapabilities: ['party-change'],
    });

    expect(response.body).toMatchObject({
      proposal: { startsAt: '2096-05-08T12:30:00+09:00', change: { step: { place: { placeId: place301 } } } },
    });
    expect((await pressChange(response.body)).status).toBe(200);
    expect(await stepOf(questId)).toEqual({ startsAt: new Date('2096-05-08T03:30:00Z'), placeId: place301 });
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
