/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { ask, postAssistantMessages } from './assistant.js';
import { befriend, signInUser, TestUser } from './friends.js';
import { invitationOf } from './quest-recruiting.js';
import { connectToDatabase, dropQuest, joinQuest, ownQuest } from './quests.js';
import { ScriptedModel, type Step } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// A Quest cancelled by words (P05 ticket 31, rows C1 to C14): proposeCancel shows one button, which the app sends as
// `DELETE /quests/:questId`. 취소하기 deletes a Quest nobody else holds, its invitations too; 나가기 leaves one others
// hold to them. A Quest only invited to, one over, a library seat, and an app without `quest-cancel` get no button.

let app: INestApplication<Server>;
let prisma: PrismaClient;
let asker: TestUser;
let minsu: TestUser;
let jieun: TestUser;
const model = new ScriptedModel();

const TOMORROW = '2096-05-08';
const CANCEL_APP = { clientCapabilities: ['library', 'answer', 'quest-cancel'] };

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, model.model);
  // 2096-05-07 09:00 in Korea.
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(new Date('2096-05-07T00:00:00Z'));
  prisma = connectToDatabase();
  [asker, minsu, jieun] = [await signInUser(app), await signInUser(app), await signInUser(app)];
  await befriend(app, asker, minsu);
  await befriend(app, asker, jieun);
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

// A Quest of the leader's tomorrow at 18:00, Open when others are to join it.
const dinner = (leader: TestUser, body: object = {}): Promise<string> =>
  ownQuest(app, leader, {
    title: '저녁 같이 먹어요',
    subQuest: { title: '저녁', startsAt: `${TOMORROW}T18:00:00+09:00` },
    ...body,
  });

function cancel(questId: string, more: object = CANCEL_APP, before: Step[] = []): request.Test {
  model.script(...before, { tool: 'proposeCancel', input: { ref: questId.slice(0, 8) } }, { text: '…' });
  return postAssistantMessages(app, asker.accessToken, ask('저녁 약속 취소해 줘'), more);
}

const nameOf = async (user: TestUser): Promise<string> =>
  (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).name;

describe('A Quest nobody else holds', () => {
  it('is shown with 취소하기 over the day drawn before, and the button deletes it (row C1)', async () => {
    const questId = await dinner(asker);
    const findDay: Step = { tool: 'findDay', input: { date: TOMORROW, questIds: [questId.slice(0, 8)] } };

    const response = await cancel(questId, CANCEL_APP, [findDay]);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      lookup: null,
      offers: [{ kind: 'leave-quest', label: '취소하기', questId }],
    });
    expect(model.toolResults()[1]).toMatchObject({ result: 'cancel-shown', button: '취소하기', leaves: false });
    expect((await dropQuest(app, asker, questId)).status).toBe(204);
    expect(await prisma.quest.count({ where: { id: questId } })).toBe(0);
  });

  it('with Friends invited who have not answered, says their invitations go too (row C3)', async () => {
    const questId = await dinner(asker);
    await invitationOf(app, asker, questId, jieun);

    await cancel(questId);

    expect(model.toolResults()[0]).toMatchObject({
      result: 'cancel-shown',
      button: '취소하기',
      invitationsGo: [expect.stringContaining(await nameOf(jieun)) as unknown],
    });
  });
});

describe('Two Quests asked to cancel in one message', () => {
  it('shows the button of the first alone, which names it, and the second is refused (one at a time)', async () => {
    const lunch = await ownQuest(app, asker, {
      title: '점심 같이 먹어요',
      subQuest: { title: '점심', startsAt: `${TOMORROW}T12:00:00+09:00` },
    });
    const dinnerId = await dinner(asker);
    model.script(
      { tool: 'proposeCancel', input: { ref: lunch.slice(0, 8) } },
      { tool: 'proposeCancel', input: { ref: dinnerId.slice(0, 8) } },
      { text: '…' },
    );

    const response = await postAssistantMessages(
      app,
      asker.accessToken,
      ask('점심이랑 저녁 둘 다 취소해 줘'),
      CANCEL_APP,
    );

    expect(response.body).toMatchObject({
      offers: [
        {
          kind: 'leave-quest',
          label: '취소하기',
          title: '점심 같이 먹어요',
          startsAt: `${TOMORROW}T12:00:00+09:00`,
          questId: lunch,
        },
      ],
    });
    expect(model.toolResults()).toEqual([
      expect.objectContaining({ result: 'cancel-shown' }),
      expect.objectContaining({ result: 'one-at-a-time' }),
    ]);
  });
});

describe('A Quest others hold', () => {
  it('is shown with 나가기, names who leads it next, and the button leaves it to them (row C2)', async () => {
    const questId = await dinner(asker, { joinPolicy: 'open' });
    await joinQuest(app, minsu, questId);

    const response = await cancel(questId);

    expect(response.body).toMatchObject({ offers: [{ kind: 'leave-quest', label: '나가기', questId }] });
    expect(model.toolResults()[0]).toMatchObject({
      result: 'cancel-shown',
      leaves: true,
      nextLeader: expect.stringContaining(await nameOf(minsu)) as unknown,
    });
    expect((await dropQuest(app, asker, questId)).status).toBe(204);
    expect(await prisma.quest.findUnique({ where: { id: questId } })).toMatchObject({ leaderId: minsu.id });
  });

  it('a Friend leads, is left with 나가기 and no next leader (row C4)', async () => {
    const questId = await dinner(minsu, { joinPolicy: 'open' });
    await joinQuest(app, asker, questId);

    await cancel(questId);

    expect(model.toolResults()[0]).toMatchObject({ result: 'cancel-shown', button: '나가기', leaves: true });
    expect(model.toolResults()[0]).not.toHaveProperty('nextLeader');
  });
});

describe('A Quest not cancelled here', () => {
  it('only invited to, is declined on its card (row C5)', async () => {
    const questId = await dinner(minsu);
    await invitationOf(app, minsu, questId, asker);

    const response = await cancel(questId);

    expect(model.toolResults()[0]).toMatchObject({ result: 'invited' });
    expect(response.body).not.toHaveProperty('offers');
  });

  it('over, is not cancelled (row C7)', async () => {
    const questId = await dinner(asker);
    await prisma.subQuest.updateMany({
      where: { questId },
      data: { startsAt: new Date('2096-05-06T22:00:00Z'), endsAt: new Date('2096-05-06T23:00:00Z') },
    });

    await cancel(questId);

    expect(model.toolResults()[0]).toMatchObject({ result: 'over' });
  });

  it('a seat kept with a library booking, is left to the library tools (row C8)', async () => {
    const questId = await dinner(asker);
    await prisma.quest.update({ where: { id: questId }, data: { seatStay: true } });

    await cancel(questId);

    expect(model.toolResults()[0]).toMatchObject({ result: 'seat' });
  });

  it('by a ref of no Quest of the User, is none (row C12)', async () => {
    model.script({ tool: 'proposeCancel', input: { ref: 'ffffffff' } }, { text: '…' });

    await postAssistantMessages(app, asker.accessToken, ask('그거 취소해 줘'), CANCEL_APP);

    expect(model.toolResults()[0]).toMatchObject({ result: 'none' });
  });

  it('for an app without the button, is left to its room (row C14)', async () => {
    const questId = await dinner(asker);

    const response = await cancel(questId, { clientCapabilities: ['library', 'answer'] });

    expect(model.toolResults()[0]).toMatchObject({ result: 'in-room' });
    expect(response.body).not.toHaveProperty('offers');
  });
});
