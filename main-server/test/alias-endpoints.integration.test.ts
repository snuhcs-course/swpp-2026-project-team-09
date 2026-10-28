/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { chooseAs, deleteAlias, getAliases, rejectAlias, resolveAs } from './aliases.js';
import { befriend, endFriendship, signInUser, TestUser } from './friends.js';
import { refuseMatchServer } from './match-server.js';
import { connectToDatabase } from './quests.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// 내가 가르친 말 and 아니에요 (P07 ticket 03): the User's own aliases listed, deleted and rejected, with the scripted
// model in the model's place. The Users' names and the words taught are this file's own. The seed's Places are
// shared, and only read.

let app: INestApplication<Server>;
let prisma: PrismaClient;
let studentCentre: string;
const model = new ScriptedModel();

// Typed, so that lint lets them into an object.
const AN_ID: unknown = expect.stringMatching(/^[0-9a-f-]{36}$/u);
const A_TIME: unknown = expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);

function named(name: string): Promise<TestUser> {
  return signInUser(app, { name, department: '컴퓨터공학부' });
}

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, refuseMatchServer, model.model);
  prisma = connectToDatabase();
  studentCentre = (await prisma.place.findFirstOrThrow({ where: { name: '학생회관' } })).id;
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

const listSchema = z.object({ aliases: z.array(z.object({ id: z.string(), words: z.string() }).loose()) });

async function aliasesOf(user: TestUser): Promise<z.infer<typeof listSchema>['aliases']> {
  const response = await getAliases(app, user);
  expect(response.status).toBe(200);
  return listSchema.parse(response.body).aliases;
}

describe('GET /assistant/aliases', () => {
  it("lists the User's own, the most recently used first, each with its target's name, 친구 for a former Friend", async () => {
    const [lister, garam, stranger] = await Promise.all(['구이목록', '구이가람', '구이남'].map((name) => named(name)));
    await befriend(app, lister, garam);
    await chooseAs(app, model, lister, { kind: 'place', id: studentCentre, words: '구이가' }, '학생회관');
    await chooseAs(app, model, lister, { kind: 'friend', id: garam.id, words: '구이 나' }, '구이가람');
    await chooseAs(app, model, lister, { kind: 'place', id: studentCentre, words: '구이가' }, '학생회관');

    const response = await getAliases(app, lister);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      aliases: [
        {
          id: AN_ID,
          kind: 'place',
          words: '구이가',
          target: { id: studentCentre, label: '학생회관' },
          uses: 2,
          lastUsedAt: A_TIME,
        },
        {
          id: AN_ID,
          kind: 'friend',
          words: '구이나',
          target: { id: garam.id, label: '구이가람' },
          uses: 1,
          lastUsedAt: A_TIME,
        },
      ],
    });
    expect(await aliasesOf(stranger)).toEqual([]);
    expect((await endFriendship(app, lister, garam.id)).status).toBe(204);
    expect((await aliasesOf(lister))[1]).toMatchObject({ target: { id: garam.id, label: '친구' } });
  });
});

describe('DELETE /assistant/aliases/:id', () => {
  it("deletes the User's own with 204, and answers 404 for another User's or one already deleted", async () => {
    const [owner, stranger] = await Promise.all([named('구이주인'), named('구이남남')]);
    await chooseAs(app, model, owner, { kind: 'place', id: studentCentre, words: '구이다' }, '학생회관');
    const [alias] = await aliasesOf(owner);
    if (alias === undefined) {
      throw new Error('No alias was taught');
    }

    expect((await deleteAlias(app, stranger, alias.id)).status).toBe(404);
    expect(await aliasesOf(owner)).toHaveLength(1);
    expect((await deleteAlias(app, owner, alias.id)).status).toBe(204);
    expect(await aliasesOf(owner)).toEqual([]);
    expect((await deleteAlias(app, owner, alias.id)).body).toMatchObject({ statusCode: 404, code: 'ALIAS_NOT_FOUND' });
    expect((await deleteAlias(app, owner, 'not-an-id')).status).toBe(400);
  });
});

describe('POST /assistant/aliases/reject', () => {
  it('records the rejection and deletes the alias, so that the rules read the words again', async () => {
    const rejecter = await named('구이아님');
    await chooseAs(app, model, rejecter, { kind: 'place', id: studentCentre, words: '학관' }, '학생회관');
    expect((await resolveAs(app, model, rejecter, '학관')).answer.result).toBe('one');

    const response = await rejectAlias(app, rejecter, { kind: 'place', words: '학 관', targetId: studentCentre });

    expect(response.status).toBe(204);
    expect((await resolveAs(app, model, rejecter, '학관')).answer.result).toBe('several');
    expect(await aliasesOf(rejecter)).toEqual([]);
    expect(await prisma.resolutionEvent.findMany({ where: { userId: rejecter.id, outcome: 'rejected' } })).toEqual([
      expect.objectContaining({
        kind: 'place',
        words: '학관',
        result: null,
        candidateIds: [],
        chosenId: studentCentre,
      }),
    ]);
  });

  it.each([
    { kind: 'place', words: '학관', targetId: '00000000-0000-4000-8000-000000000000', source: 'personal' },
    { kind: 'globalEvent', words: '학관', targetId: '00000000-0000-4000-8000-000000000000' },
    { kind: 'place', words: ' ', targetId: '00000000-0000-4000-8000-000000000000' },
    { kind: 'place', words: '가'.repeat(51), targetId: '00000000-0000-4000-8000-000000000000' },
    { kind: 'place', words: '학관', targetId: 'not-an-id' },
  ])('refuses %j with 400', async (body) => {
    const response = await rejectAlias(app, await named('구이거절'), body);

    expect(response.status).toBe(400);
  });
});
