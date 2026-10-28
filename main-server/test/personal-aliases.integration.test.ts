/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { chooseAs, idsOf, resolveAs, type Resolution } from './aliases.js';
import { postAssistantMessages } from './assistant.js';
import { befriend, endFriendship, signInUser, TestUser } from './friends.js';
import { refuseMatchServer } from './match-server.js';
import { connectToDatabase } from './quests.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// A User's own aliases (P07 ticket 03), taught by a chip or by changing a Proposal's Place, answering that User alone,
// with the scripted model in the model's place. The app's clock stands in June 2091, which no other file uses, and the
// Friends' names are this file's own. The seed's Places are shared, and only read.

let app: INestApplication<Server>;
let prisma: PrismaClient;
let user: TestUser;
let other: TestUser;
let minji: TestUser;
let minho: TestUser;
let studentCentre: string;
let infoCentre: string;
let place301: string;
const model = new ScriptedModel();

// 2091-06-01 09:00 in Korea.
const NOW = new Date('2091-06-01T00:00:00Z');

function named(name: string): Promise<TestUser> {
  return signInUser(app, { name, department: '컴퓨터공학부' });
}

function placeNamed(name: string): Promise<string> {
  return prisma.place.findFirstOrThrow({ where: { name } }).then(({ id }) => id);
}

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, refuseMatchServer, model.model);
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(NOW);
  prisma = connectToDatabase();
  [user, other, minji, minho] = await Promise.all(
    ['홍길동', '홍길순', '구일민지', '구일민호'].map((name) => named(name)),
  );
  await befriend(app, user, minji);
  await befriend(app, user, minho);
  studentCentre = await placeNamed('학생회관');
  infoCentre = await placeNamed('유회진 학술정보관');
  place301 = (await prisma.place.findFirstOrThrow({ where: { number: '301' } })).id;
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

function resolve(asker: TestUser, words: string, tool?: 'resolvePlace' | 'resolveFriend'): Promise<Resolution> {
  return resolveAs(app, model, asker, words, tool);
}

describe("a Place alias of the User's", () => {
  it('answers one after one chip choice, for that User alone, and says so under the reply', async () => {
    expect((await resolve(user, '학관')).answer.result).toBe('several');

    await chooseAs(app, model, user, { kind: 'place', id: studentCentre, words: '학관' }, '학생회관');

    const { answer, body } = await resolve(user, '학 관');
    expect(idsOf(answer)).toEqual([studentCentre]);
    expect(answer.result).toBe('one');
    expect(body).toEqual({
      choices: [],
      resolvedBy: [{ kind: 'place', words: '학 관', id: studentCentre, label: '학생회관', source: 'personal' }],
    });
    const row = await prisma.resolutionEvent.findFirstOrThrow({
      where: { userId: user.id, outcome: 'answered' },
      orderBy: { createdAt: 'desc' },
    });
    expect(row).toMatchObject({ words: '학관', result: 'one', tier: 'alias', aliasSource: 'personal' });
    const forOther = await resolve(other, '학관');
    expect(forOther.answer.result).toBe('several');
    expect(forOther.body.resolvedBy).toEqual([]);
  });

  it('answers several once the User taught two Places for the words, with nothing under the reply', async () => {
    await chooseAs(app, model, user, { kind: 'place', id: infoCentre, words: '학관' }, '유회진 학술정보관');

    const { answer, body } = await resolve(user, '학관');

    expect(idsOf(answer).toSorted()).toEqual([studentCentre, infoCentre].toSorted());
    expect(body.resolvedBy).toEqual([]);
  });

  it('never answers with a Place the catalog does not have', async () => {
    await prisma.userAlias.create({
      data: { userId: user.id, kind: 'place', words: '구일없는곳', targetId: randomUUID() },
    });

    expect((await resolve(user, '구일없는곳')).answer.result).toBe('none');
  });
});

// A complete Open Proposal on the meal Board, for the next day's lunch, without its Place.
const LUNCH = {
  title: '2091 점심',
  description: '점심 같이 먹어요',
  joinPolicy: 'open',
  board: 'meal',
  capacity: 4,
  startsAt: '2091-06-02T12:00:00+09:00',
} as const;

describe('a Place alias taught by changing a Proposal', () => {
  it('answers the Place the Proposal was changed to, which proposeQuest then takes', async () => {
    const editor = await named('홍편집');
    model.script(
      { tool: 'resolvePlace', input: { words: '학관' } },
      { tool: 'proposeQuest', input: { ...LUNCH, placeId: studentCentre } },
      { text: '…' },
    );
    await postAssistantMessages(app, editor.accessToken, [
      { role: 'user', text: '내일 점심 4명 모집해줘' },
      {
        role: 'assistant',
        text: '만들기를 눌러 주세요.',
        proposal: { ...LUNCH, place: { id: place301, name: '제1공학관' }, globalEvent: null, invitees: [] },
      },
      { role: 'user', text: '장소만 학관으로' },
    ]);

    model.script(
      { tool: 'resolvePlace', input: { words: '학관' } },
      { tool: 'proposeQuest', input: { ...LUNCH, placeId: studentCentre } },
      { text: '만들기를 눌러 주세요.' },
    );
    const response = await postAssistantMessages(app, editor.accessToken, [{ role: 'user', text: '학관에서 점심' }]);

    const [answer, proposed] = model.toolResults();
    expect(answer).toMatchObject({ result: 'one', candidate: { id: studentCentre } });
    expect(proposed).toMatchObject({ result: 'proposed' });
    expect(response.body).toMatchObject({ proposal: { place: { id: studentCentre } } });
  });
});

describe("a Friend alias of the User's", () => {
  it('answers the Friend chosen, and nothing once they are no Friend', async () => {
    expect(idsOf((await resolve(user, '구일민', 'resolveFriend')).answer)).toEqual([minji.id, minho.id]);

    await chooseAs(app, model, user, { kind: 'friend', id: minji.id, words: '구일민' }, '구일민지');

    const { answer, body } = await resolve(user, '구일민', 'resolveFriend');
    expect(idsOf(answer)).toEqual([minji.id]);
    expect(body.resolvedBy).toEqual([
      { kind: 'friend', words: '구일민', id: minji.id, label: '구일민지', source: 'personal' },
    ]);
    expect(
      await prisma.resolutionEvent.findFirst({ where: { userId: user.id, kind: 'friend', result: 'one' } }),
    ).toMatchObject({
      aliasSource: 'personal',
      tier: null,
    });

    expect((await endFriendship(app, user, minji.id)).status).toBe(204);
    const after = await resolve(user, '구일민', 'resolveFriend');
    expect(idsOf(after.answer)).toEqual([minho.id]);
    expect(after.body.resolvedBy).toEqual([]);
  });
});
