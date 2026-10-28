/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PlaceAlias, PrismaClient } from '../src/generated/prisma/client.js';
import { chooseAs, idsOf, rejectAlias, resolveAs, type Resolution } from './aliases.js';
import { befriend, signInUser, TestUser } from './friends.js';
import { refuseMatchServer } from './match-server.js';
import { connectToDatabase } from './quests.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// Every User's Place aliases (P07 ticket 03): learned from the choices of distinct accounts old enough, retired by
// distinct accounts' rejections, switched off as a whole, and kept from a held-back share, with the scripted model in
// the model's place. The words are this file's own and begin with 뷁, which no Place's name, short form or near
// spelling answers, so that only an alias does. The seed's Places are shared, and only read. The app holds nobody
// back, so that every User of it receives everyone's aliases.

let app: INestApplication<Server>;
let prisma: PrismaClient;
let studentCentre: string;
let library: string;
const model = new ScriptedModel();

const DAY_MS = 24 * 60 * 60 * 1000;

beforeAll(async () => {
  app = await startApp(
    { ...inject('settings'), ASSISTANT_ALIAS_HOLDBACK_PERCENT: '0' },
    [],
    refuseKakao,
    refuseMatchServer,
    model.model,
  );
  prisma = connectToDatabase();
  studentCentre = (await prisma.place.findFirstOrThrow({ where: { name: '학생회관' } })).id;
  library = (await prisma.place.findFirstOrThrow({ where: { name: '중앙도서관 관정관' } })).id;
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

// A new account, onboarded `days` ago.
async function account(days = 0): Promise<TestUser> {
  const user = await signInUser(app);
  await prisma.user.update({ where: { id: user.id }, data: { onboardedAt: new Date(Date.now() - days * DAY_MS) } });
  return user;
}

function choose(user: TestUser, placeId: string, words: string): Promise<void> {
  return chooseAs(app, model, user, { kind: 'place', id: placeId, words }, '학생회관');
}

// Each of `count` accounts a month old chooses the Place for the words.
async function teachEveryone(count: number, placeId: string, words: string): Promise<void> {
  for (const user of await Promise.all(Array.from({ length: count }, () => account(30)))) {
    // oxlint-disable-next-line no-await-in-loop -- one message after another through the one scripted model
    await choose(user, placeId, words);
  }
}

async function newcomerResolves(words: string, on = app): Promise<Resolution> {
  return resolveAs(on, model, await account(), words);
}

function aliasesFor(words: string): Promise<PlaceAlias[]> {
  return prisma.placeAlias.findMany({ where: { words } });
}

describe('promotion', () => {
  it('never comes of one account choosing a Place ten times', async () => {
    const insistent = await account(30);
    for (let time = 0; time < 10; time += 1) {
      // oxlint-disable-next-line no-await-in-loop -- one message after another through the one scripted model
      await choose(insistent, studentCentre, '뷁일');
    }

    expect((await newcomerResolves('뷁일')).answer.result).toBe('none');
    expect(await aliasesFor('뷁일')).toEqual([]);
    expect((await resolveAs(app, model, insistent, '뷁일')).answer.result).toBe('one');
  });

  it('comes of three distinct accounts old enough, an account of 3 days not counting, and answers every User', async () => {
    await teachEveryone(2, studentCentre, '뷁이');
    await choose(await account(3), studentCentre, '뷁이');
    expect((await newcomerResolves('뷁이')).answer.result).toBe('none');

    await teachEveryone(1, studentCentre, '뷁이');

    const { answer, body } = await newcomerResolves('뷁 이');
    expect(idsOf(answer)).toEqual([studentCentre]);
    expect(answer.result).toBe('one');
    expect(body.resolvedBy).toEqual([
      { kind: 'place', words: '뷁 이', id: studentCentre, label: '학생회관', source: 'global' },
    ]);
    expect(await aliasesFor('뷁이')).toEqual([
      expect.objectContaining({
        placeId: studentCentre,
        source: 'learned',
        supporters: 3,
        rejecters: 0,
        retiredAt: null,
      }),
    ]);
  });
});

describe('promotion, safe', () => {
  it('is retired once another Place takes more than a fifth of the accounts', async () => {
    await teachEveryone(3, studentCentre, '뷁삼');
    expect((await newcomerResolves('뷁삼')).answer.result).toBe('one');

    await teachEveryone(1, library, '뷁삼');

    expect((await newcomerResolves('뷁삼')).answer.result).toBe('none');
    expect(await aliasesFor('뷁삼')).toEqual([
      expect.objectContaining({ placeId: studentCentre, supporters: 3, retiredAt: expect.any(Date) as unknown }),
    ]);
  });

  it('never comes of Friend aliases', async () => {
    const friend = await account();
    for (const user of await Promise.all([account(30), account(30), account(30)])) {
      // oxlint-disable-next-line no-await-in-loop -- one message after another through the one scripted model
      await befriend(app, user, friend);
      // oxlint-disable-next-line no-await-in-loop -- one message after another through the one scripted model
      await chooseAs(app, model, user, { kind: 'friend', id: friend.id, words: '뷁짝' }, '홍길동');
    }

    expect(await aliasesFor('뷁짝')).toEqual([]);
    expect(await prisma.userAlias.count({ where: { kind: 'friend', words: '뷁짝' } })).toBe(3);
  });
});

describe('retirement', () => {
  it('comes of rejections by distinct accounts, once they are as many as the supporters', async () => {
    await teachEveryone(3, studentCentre, '뷁사');
    const [first, second, third] = await Promise.all([account(), account(), account()]);
    const reject = (user: TestUser): Promise<unknown> =>
      rejectAlias(app, user, { kind: 'place', words: '뷁사', targetId: studentCentre }).expect(204);

    await reject(first);
    await reject(first);
    await reject(second);
    expect((await newcomerResolves('뷁사')).answer.result).toBe('one');
    await reject(third);

    expect((await newcomerResolves('뷁사')).answer.result).toBe('none');
    expect(await aliasesFor('뷁사')).toEqual([
      expect.objectContaining({ supporters: 3, rejecters: 3, retiredAt: expect.any(Date) as unknown }),
    ]);
  });
});

describe('the switch and the holdback', () => {
  beforeAll(async () => {
    await teachEveryone(3, studentCentre, '뷁오');
  });

  it('answers nobody once ASSISTANT_GLOBAL_ALIASES is false', async () => {
    const switchedOff = await startApp(
      { ...inject('settings'), ASSISTANT_GLOBAL_ALIASES: 'false', ASSISTANT_ALIAS_HOLDBACK_PERCENT: '0' },
      [],
      refuseKakao,
      refuseMatchServer,
      model.model,
    );
    try {
      expect((await newcomerResolves('뷁오', switchedOff)).answer.result).toBe('none');
    } finally {
      await switchedOff.close();
    }
    expect((await newcomerResolves('뷁오')).answer.result).toBe('one');
  });

  it('answers no User held back, who still gets their own', async () => {
    const holdingAll = await startApp(
      { ...inject('settings'), ASSISTANT_ALIAS_HOLDBACK_PERCENT: '100' },
      [],
      refuseKakao,
      refuseMatchServer,
      model.model,
    );
    try {
      const heldBack = await account();
      expect((await resolveAs(holdingAll, model, heldBack, '뷁오')).answer.result).toBe('none');
      await chooseAs(holdingAll, model, heldBack, { kind: 'place', id: library, words: '뷁오' }, '중앙도서관 관정관');
      const { answer, body } = await resolveAs(holdingAll, model, heldBack, '뷁오');
      expect(idsOf(answer)).toEqual([library]);
      expect(body.resolvedBy).toMatchObject([{ source: 'personal' }]);
    } finally {
      await holdingAll.close();
    }
  });
});
