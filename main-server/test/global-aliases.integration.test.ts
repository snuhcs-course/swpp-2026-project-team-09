/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-11-01  Fable 5.1  prompted by fyoon46
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

// Everyone's alias of the words last answered `days` ago.
async function unusedFor(words: string, days: number): Promise<void> {
  await prisma.placeAlias.updateMany({ where: { words }, data: { lastUsedAt: new Date(Date.now() - days * DAY_MS) } });
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

describe('decay', () => {
  it('retires an alias of 3 supporters unused for 80 days, and keeps one used 20 days ago', async () => {
    await teachEveryone(3, studentCentre, '뷁육');
    await teachEveryone(3, studentCentre, '뷁칠');
    await unusedFor('뷁육', 80);
    await unusedFor('뷁칠', 20);

    expect((await newcomerResolves('뷁육')).answer.result).toBe('none');
    expect(await aliasesFor('뷁육')).toEqual([expect.objectContaining({ retiredAt: expect.any(Date) as unknown })]);
    expect((await newcomerResolves('뷁칠')).answer.result).toBe('one');
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

// The account resolves the words, which no rule answers, and then the Place by its name, `minutesApart` later.
async function openedThenNamed(words: string, minutesApart = 0): Promise<void> {
  for (const user of await Promise.all([account(30), account(30), account(30)])) {
    // oxlint-disable-next-line no-await-in-loop -- one message after another through the one scripted model
    expect((await resolveAs(app, model, user, words)).answer.result).toBe('none');
    if (minutesApart > 0) {
      // oxlint-disable-next-line no-await-in-loop -- the same
      await prisma.resolutionEvent.updateMany({
        where: { userId: user.id, words },
        data: { createdAt: new Date(Date.now() - minutesApart * 60 * 1000) },
      });
    }
    // oxlint-disable-next-line no-await-in-loop -- the same
    await resolveAs(app, model, user, '학생회관');
  }
}

describe('the alias chain', () => {
  it('learns words answered none from the Place the accounts then named in the same session', async () => {
    await openedThenNamed('뷁팔');

    const { answer, body } = await newcomerResolves('뷁팔');
    expect(idsOf(answer)).toEqual([studentCentre]);
    expect(body.resolvedBy).toMatchObject([{ source: 'global', words: '뷁팔' }]);
    const [alias] = await aliasesFor('뷁팔');
    expect(alias).toMatchObject({
      placeId: studentCentre,
      supporters: 3,
      rejecters: 0,
      ownSuccess: 0,
      retiredAt: null,
    });
    expect(alias?.success).toBeGreaterThan(0);
    expect(alias?.success).toBeLessThanOrEqual(1);
  });

  it('learns nothing across a gap of over 5 minutes, another session', async () => {
    await openedThenNamed('뷁구', 6);

    expect((await newcomerResolves('뷁구')).answer.result).toBe('none');
    expect(await aliasesFor('뷁구')).toEqual([]);
  });

  it('keeps an exact name its own answer though three accounts choose another Place for it', async () => {
    await teachEveryone(3, library, '학생회관');

    expect(idsOf((await newcomerResolves('학생회관')).answer)).toEqual([studentCentre]);
    expect(await aliasesFor('학생회관')).toEqual([]);
  });
});
