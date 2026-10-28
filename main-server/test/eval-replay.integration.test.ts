/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject, type ProvidedContext } from 'vitest';
import { catalogOf } from '../eval/replay/database.ts';
import { type GoldItem, itemsOf, loadGold } from '../eval/replay/gold.ts';
import { learningCurve } from '../eval/replay/learning-curve.ts';
import { replayGold } from '../eval/replay/replay.ts';
import { substringMatch } from '../eval/replay/stages.ts';
import { suggestionCurves } from '../eval/replay/suggestions.ts';
import { type Prisma, type PrismaClient } from '../src/generated/prisma/client.js';
import { type PlaceDto } from '../src/places/dto/place.dto.js';
import { connect, type SeededDatabase, seededDatabase } from './containers.js';
import { startApp } from './start-app.js';

// The replay (P07 ticket 05) on a seeded database of its own, whose resolution_events and impressions are this
// file's alone: stage A against PlacesService.search, the gold file against the seed, stage C and the learning curve
// learning only from the rows before their time, and the suggestions read by the days asked.

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const NOW = Date.now();

let database: SeededDatabase<ProvidedContext['settings']>;
let prisma: PrismaClient;
let app: INestApplication<Server>;
let places: PlaceDto[];

beforeAll(async () => {
  database = await seededDatabase(inject('settings'));
  prisma = connect(database.url);
  app = await startApp(database.settings);
  places = await catalogOf(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
  await database.drop();
});

function idOf(name: string): string {
  const found = places.find((place) => place.name === name);
  if (found === undefined) {
    throw new Error(`The seed has no ${name}`);
  }
  return found.id;
}

// An account onboarded long before every row of this file, so that each choice counts.
async function account(): Promise<string> {
  const onboardedAt = new Date(NOW - 120 * DAY_MS);
  const { id } = await prisma.user.create({
    data: { googleSubject: randomUUID(), email: 'replay@example.com', friendId: randomUUID(), onboardedAt },
  });
  return id;
}

function accounts(count: number): Promise<string[]> {
  return Promise.all(Array.from({ length: count }, () => account()));
}

function events(rows: Omit<Prisma.ResolutionEventCreateManyInput, 'kind'>[]): Promise<Prisma.BatchPayload> {
  return prisma.resolutionEvent.createMany({ data: rows.map((row) => ({ kind: 'place', ...row })) });
}

function choices(userIds: string[], words: string, placeId: string, at: Date): Promise<Prisma.BatchPayload> {
  return events(userIds.map((userId) => ({ userId, words, outcome: 'chosen', chosenId: placeId, createdAt: at })));
}

function item(words: string, accept: string[]): GoldItem {
  return { words, accept, collected: '2026-10-28', set: 'development' };
}

describe('Stage A', () => {
  it('answers exactly what PlacesService.search answers, on the seed', async () => {
    // Imported after startApp, so that it is the class the app registered.
    const { PlacesService } = await import('../src/places/places.service.js');
    const service = app.get(PlacesService);
    const words = [...loadGold().map(({ words: text }) => text), '관', '공학', 'SK', 'sk경영관', '302', '25-1동', '동'];

    const pairs = await Promise.all(
      words.map(async (text) => [
        substringMatch(places, text).map(({ id }) => id),
        (await service.search(text)).map(({ id }) => id),
      ]),
    );

    for (const [stage, search] of pairs) {
      expect(stage).toEqual(search);
    }
  });
});

describe('The gold file on the seed', () => {
  it('names only Places of the seed, and the rules find more of the development set than substrings do', async () => {
    const replay = await replayGold(prisma, itemsOf(loadGold(), 'development'), new Date(NOW - 100 * DAY_MS));

    expect(replay.items).toHaveLength(itemsOf(loadGold(), 'development').length);
    expect(replay.stages.B.recallAt10.k).toBeGreaterThan(replay.stages.A.recallAt10.k);
    expect(replay.stages.C).toEqual(replay.stages.B);
  });
});

describe('Stage C', () => {
  it('learns only from the rows before --as-of, which the later rows would change', async () => {
    const asOf = new Date(NOW - 10 * DAY_MS);
    const [early, late] = await Promise.all([accounts(3), accounts(3)]);
    await choices(early, '학관', idOf('학생회관'), new Date(asOf.getTime() - 2 * DAY_MS));
    await choices(late, '학관', idOf('유회진 학술정보관'), new Date(asOf.getTime() + DAY_MS));
    await choices(late, '중도', idOf('중앙도서관 관정관'), new Date(asOf.getTime() + DAY_MS));
    const items = [item('학관', ['학생회관']), item('중도', ['중앙도서관 본관', '중앙도서관 관정관'])];

    const then = await replayGold(prisma, items, asOf);
    const later = await replayGold(prisma, items, new Date(NOW));

    expect(then.learned).toEqual({ personal: 3, global: 1 });
    expect(then.items[0]?.answers.C).toMatchObject({ result: 'one', source: 'global', candidates: ['학생회관'] });
    expect(then.items[1]?.answers.C).toEqual(then.items[1]?.answers.B);
    expect(later.items.map(({ answers }) => [answers.C.tier, answers.C.result, answers.C.candidates[0]])).toEqual([
      ['generated', 'several', '학생회관'],
      ['alias', 'one', '중앙도서관 관정관'],
    ]);
  });
});

// The User asks with 학관 an hour after `point` and chooses the Place an hour later.
function askedAndChose(userId: string, point: Date, placeId: string): Promise<Prisma.BatchPayload> {
  const at = (hours: number): Date => new Date(point.getTime() + hours * HOUR_MS);
  return events([
    { userId, words: '학관', outcome: 'answered', result: 'several', createdAt: at(1) },
    { userId, words: '학관', outcome: 'chosen', chosenId: placeId, createdAt: at(2) },
  ]);
}

describe('The learning curve', () => {
  it('scores each labelled row with the aliases of the rows before its point, never with its own label', async () => {
    const [user = ''] = await accounts(1);
    const from = new Date(NOW - 40 * DAY_MS);
    const to = new Date(from.getTime() + 7 * DAY_MS);
    const dormitory = idOf('(관악사)학부 생활관');
    await Promise.all([from, to].map((point) => askedAndChose(user, point, dormitory)));

    const curve = await learningCurve(prisma, { from, to, stepDays: 7 }, 0);
    const heldBack = await learningCurve(prisma, { from, to, stepDays: 7 }, 100);

    expect(curve.points.map(({ learned }) => learned)).toEqual([
      { personal: 0, global: 0 },
      { personal: 1, global: 0 },
    ]);
    expect(
      curve.points.map(({ learning: { n, askRules, askLearned, top1Rules, top1Learned } }) => [
        n,
        askRules.k,
        askLearned.k,
        top1Rules.k,
        top1Learned.k,
      ]),
    ).toEqual([
      [1, 1, 1, 0, 0],
      [1, 1, 0, 0, 1],
    ]);
    expect(heldBack.points.map(({ learning, holdback }) => [learning.n, holdback.n])).toEqual([
      [0, 1],
      [0, 1],
    ]);
  });
});

describe('The suggestion curves', () => {
  it('read the impressions shown on the days asked whose outcome is settled', async () => {
    const [userId = ''] = await accounts(1);
    const shownAt = new Date(NOW - 5 * DAY_MS);
    const base = {
      userId,
      template: 'lunch_with_free_friend',
      eligible: ['lunch_with_free_friend'],
      bucket: 'midday',
      propensity: 0.9,
      holdback: false,
    };
    await prisma.suggestionImpression.createMany({
      data: [
        { ...base, shownAt, outcome: 'accepted', outcomeAt: new Date(shownAt.getTime() + 60_000) },
        { ...base, shownAt },
        { ...base, shownAt: new Date(NOW - 30 * DAY_MS) },
        { ...base, shownAt: new Date(NOW - 60_000) },
      ],
    });

    const curves = await suggestionCurves(
      prisma,
      { from: new Date(NOW - 7 * DAY_MS), until: new Date(NOW + DAY_MS) },
      new Date(NOW),
    );

    expect(curves.weeks.reduce((total, { shown }) => total + shown, 0)).toBe(2);
    expect(curves.weighted).toEqual([
      { template: 'lunch_with_free_friend', holdback: false, shown: 2, acceptance: 0.5 },
    ]);
  });
});
