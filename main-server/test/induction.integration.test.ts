/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject, type ProvidedContext } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { chooseAs, resolveAs } from './aliases.js';
import { connect, type SeededDatabase, seededDatabase } from './containers.js';
import { signInUser, TestUser } from './friends.js';
import { refuseMatchServer } from './match-server.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// The induction of matching rules through HTTP (P07 ticket 07), on a seeded database of its own, with the scripted
// model as the reflector: two accounts' labelled 뷁-words make a words rule, which answers a third account on the
// induced tier and never a held-back one. The words begin with 뷁, which nothing in the catalog answers, and neither
// falls in the fifth of the words the induction holds out (instances.ts).

const DAY_MS = 24 * 60 * 60 * 1000;

let database: SeededDatabase<ProvidedContext['settings']>;
let prisma: PrismaClient;
let app: INestApplication<Server>;
let hall: string;
let library: string;
const model = new ScriptedModel();

const PROPOSALS = JSON.stringify({
  rules: [
    { kind: 'words', pattern: '^뷁(.+)$', replace: '$1', why: 'the 뷁 is noise before a name' },
    { kind: 'words', pattern: '^(.+)$', replace: '학생회관', why: 'everything is the hall' },
  ],
});

beforeAll(async () => {
  database = await seededDatabase(inject('settings'));
  prisma = connect(database.url);
  app = await startApp(
    { ...database.settings, ASSISTANT_ALIAS_HOLDBACK_PERCENT: '0', ASSISTANT_INDUCTION_BUDGET: '2' },
    [],
    refuseKakao,
    refuseMatchServer,
    model.model,
  );
  hall = (await prisma.place.findFirstOrThrow({ where: { name: '학생회관' } })).id;
  library = (await prisma.place.findFirstOrThrow({ where: { name: '중앙도서관 본관' } })).id;
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
  await database.drop();
});

// A new account, onboarded `days` ago.
async function account(days = 30): Promise<TestUser> {
  const user = await signInUser(app);
  await prisma.user.update({ where: { id: user.id }, data: { onboardedAt: new Date(Date.now() - days * DAY_MS) } });
  return user;
}

// The User asks with the words, gets nothing, and chooses the Place they meant.
async function label(user: TestUser, words: string, placeId: string): Promise<void> {
  const { answer } = await resolveAs(app, model, user, words);
  expect(answer.result).toBe('none');
  await chooseAs(app, model, user, { kind: 'place', id: placeId, words }, '학생회관');
}

// Two accounts label both 뷁-words, one call of the scripted model at a time.
async function labelled(): Promise<void> {
  for (const user of [await account(), await account()]) {
    // oxlint-disable-next-line no-await-in-loop -- the scripted model answers one call at a time
    await label(user, '뷁학생회관', hall);
    // oxlint-disable-next-line no-await-in-loop -- the same
    await label(user, '뷁중앙도서관본관', library);
  }
}

function induction(data: object): request.Test {
  return request(app.getHttpServer())
    .post('/assistant/induction')
    .auth(inject('settings').WORKER_TOKEN, { type: 'bearer' })
    .send(data);
}

describe('POST /assistant/induction', () => {
  it('needs the worker token', async () => {
    await request(app.getHttpServer()).post('/assistant/induction').send({}).expect(401);
  });

  it('answers at once without wait, and joins the run going on', async () => {
    model.script({ text: '{"rules":[]}' }, { text: '{"rules":[]}' });
    await induction({}).expect(200, { started: true });
    await induction({ wait: true }).expect(200);
  });
});

describe('A rule the induction made', () => {
  it("comes from two accounts' labelled words, and answers a third account on the induced tier", async () => {
    await labelled();
    model.script({ text: PROPOSALS }, { text: PROPOSALS });

    const response = await induction({ wait: true }).expect(200);

    expect(response.body).toMatchObject({
      model: 'test/model',
      calls: 1,
      promoted: [{ kind: 'words', pattern: '^뷁(.+)$', replace: '$1', fixed: 2, broke: 0, accounts: 2 }],
      retired: [],
      active: 1,
    });
    await expect(prisma.inducedRule.findMany({ where: { retiredAt: null } })).resolves.toMatchObject([
      { pattern: '^뷁(.+)$', replace: '$1', fixed: 2, accounts: 2, model: 'test/model' },
    ]);

    const third = await account();
    const { answer } = await resolveAs(app, model, third, '뷁중앙도서관본관');
    expect(answer).toMatchObject({ result: 'one', candidate: { id: library } });
    await expect(
      prisma.resolutionEvent.findFirst({
        where: { userId: third.id, words: '뷁중앙도서관본관', outcome: 'answered' },
      }),
    ).resolves.toMatchObject({ tier: 'induced', result: 'one' });
  });

  it('never answers a held-back account on the induced tier', async () => {
    const heldBack = await startApp(
      { ...database.settings, ASSISTANT_ALIAS_HOLDBACK_PERCENT: '100' },
      [],
      refuseKakao,
      refuseMatchServer,
      model.model,
    );
    try {
      const user = await signInUser(heldBack);
      const { answer } = await resolveAs(heldBack, model, user, '뷁학생회관');
      expect(answer.result).toBe('none');
    } finally {
      await heldBack.close();
    }
  });
});
