/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { Server } from 'node:http';
import { inject, type ProvidedContext } from 'vitest';
import { parse } from 'yaml';
import { z } from 'zod';
import { casesIn, kindOf, loadCases, WORLD_CLOCKS } from '../eval/cases.ts';
import { travelFixture } from '../eval/p4/travel-fixture.ts';
import { seedP4World } from '../eval/p4/world.ts';
import { worldData } from '../eval/p4/world-data.ts';
import { type World } from '../eval/world.ts';
import { metresBetween, type Position } from '../src/common/geometry.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { ask, postAssistantMessages } from './assistant.js';
import { connect, type SeededDatabase, seededDatabase } from './containers.js';
import { unseeded } from './eval-refs.ts';
import { refuseMatchServer } from './match-server.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// The P4 suite's cases, world and travel fixture (P04 ticket 03), without a model: the set is the ticket's, the fixture
// covers the world, and every seed name a case gives is something of that kind in the world, seeded into a database of
// its own. The answers themselves are worked by hand, and the judgement suite checks them.

const cases = casesIn(loadCases(), 'p4');
const data = worldData();

const suiteSchema = z.strictObject({
  world: z.literal('p4'),
  cases: z.record(z.string(), z.int()),
  score: z.strictObject({ overall: z.number(), perCategory: z.number(), runs: z.int() }),
  labels: z.strictObject({
    draftedBy: z.string().min(1),
    draftedOn: z.iso.date(),
    reviewedBy: z.string().nullable(),
    reviewedOn: z.iso.date().nullable(),
    openForReview: z.array(
      z.strictObject({ id: z.string(), kind: z.enum(['meaning', 'rules']), why: z.string().min(1) }),
    ),
  }),
});

const workingSchema = z.array(
  z.strictObject({ id: z.string(), working: z.string().min(1), open: z.literal(true).optional() }),
);

function suiteFile(name: string): unknown {
  return parse(readFileSync(new URL(`../eval/p4/${name}`, import.meta.url), 'utf8'));
}

const suite = suiteSchema.parse(suiteFile('suite.yaml'));
const working = workingSchema.parse(suiteFile('labels-working.yaml'));

describe('The P4 suite', () => {
  it('holds 40 cases: 공강 파티 15, 공강에 밥 15, 공통 10', () => {
    const counts: Record<string, number> = {};
    for (const { category } of cases) {
      counts[category] = (counts[category] ?? 0) + 1;
    }

    expect(counts).toEqual({ 'free-time-parties': 15, 'free-time-meals': 15, 'free-time-common': 10 });
    expect(counts).toEqual(suite.cases);
  });

  it('commits its thresholds, and runs every case 3 times', () => {
    expect(suite.score).toEqual({ overall: 0.8, perCategory: 0.7, runs: 3 });
    expect(cases.filter(({ repeat }) => repeat !== 3)).toEqual([]);
  });

  it('asks its follow-ups from fixed histories, none of them live', () => {
    expect(cases.filter(({ live }) => live)).toEqual([]);
    const followUps = new Set(['parties-over-twenty-narrowed', 'meals-no-noodles', 'meals-here-after-cards']);
    expect(cases.filter(({ id }) => followUps.has(id)).map((evalCase) => kindOf(evalCase))).toEqual([
      'history',
      'history',
      'history',
    ]);
  });
});

describe('The labels', () => {
  it('give every case an expectation for the turn it scores, and the drafter keeps its working', () => {
    expect(cases.filter((evalCase) => evalCase.expect === undefined).map(({ id }) => id)).toEqual([]);
    expect(working.map(({ id }) => id).toSorted()).toEqual(cases.map(({ id }) => id).toSorted());
  });

  it('are listed for the review wherever the drafter left them open', () => {
    const open = working.filter((entry) => entry.open === true).map(({ id }) => id);

    expect(suite.labels.openForReview.map(({ id }) => id).toSorted()).toEqual(open.toSorted());
  });
});

describe('The travel fixture', () => {
  it('gives every ordered pair of the Places the world uses, once', () => {
    const places = Object.keys(data.places);
    const pairs = travelFixture().map(({ from, to }) => `${from} → ${to}`);

    expect(pairs.toSorted()).toEqual(places.flatMap((from) => places.map((to) => `${from} → ${to}`)).toSorted());
  });
});

const samePoint = (a: Position, b: Position): boolean => a.latitude === b.latitude && a.longitude === b.longitude;

const pointsUsed: Position[] = [
  ...data.globalEvents.map(({ point }) => point),
  ...data.quests.flatMap(({ subQuests }) => subQuests.map(({ place }) => place)).filter((place) => 'latitude' in place),
  ...Object.values(data.friends)
    .flatMap(({ quests }) => quests.map(({ subQuest }) => subQuest.place))
    .filter((place) => 'latitude' in place),
];

// The nearest of the Places to a point, in whole metres.
function nearestOf(places: readonly (Position & { name: string })[], point: Position): object {
  const [nearest] = places
    .map(({ name, ...place }) => ({ name, metres: metresBetween(place, point) }))
    .toSorted((a, b) => a.metres - b.metres);
  return { nearest: nearest?.name, metres: Math.round(nearest?.metres ?? 0) };
}

// What the shared seed answers for each point of the world.
async function mapFacts(app: INestApplication<Server>, databaseUrl: string): Promise<object[]> {
  const { PlaceLookup } = await import('../src/places/place-lookup.js');
  const lookup = app.get(PlaceLookup);
  const prisma = connect(databaseUrl);
  const places = await prisma.place.findMany();
  await prisma.$disconnect();
  return data.mappedPoints.map(({ latitude, longitude }) => {
    const point = { latitude, longitude };
    return {
      ...point,
      exact: places.find((place) => samePoint(place, point))?.name ?? null,
      lookup: lookup.at(point)?.place.name ?? null,
      ...nearestOf(places, point),
    };
  });
}

describe('The world the cases refer to', () => {
  const model = new ScriptedModel();
  let database: SeededDatabase<ProvidedContext['settings']>;
  let app: INestApplication<Server>;
  let world: World;

  beforeAll(async () => {
    database = await seededDatabase(inject('settings'));
    app = await startApp(database.settings, [], refuseKakao, refuseMatchServer, model.model);
    vi.spyOn(app.get<Clock>(CLOCK), 'now').mockImplementation(() => new Date(WORLD_CLOCKS.p4));
    world = await seedP4World(app, database.url);
  });

  afterAll(async () => {
    await app.close();
    await database.drop();
  });

  it('holds every seed name a case gives, as the kind of thing the case takes it for', () => {
    expect(unseeded(cases, world)).toEqual([]);
  });

  // What a follow-up's right answer rests on, as the scripted model calls each resolver.
  it.each([
    ['resolveFriend', { name: '민수' }, '"one"'],
    ['resolveFriend', { name: '서준' }, '"several"'],
    ['resolvePlace', { words: '서울대 정문' }, '"one"'],
    ['resolvePlace', { words: '낙성대역' }, '"none"'],
  ])('%s %j answers %s', async (tool, input, answer) => {
    model.script({ tool, input }, { text: '…' });

    const response = await postAssistantMessages(app, world.accessToken, ask('…'));

    expect(response.status).toBe(200);
    expect(JSON.stringify(model.toolResults()[0])).toContain(answer);
  });

  it('holds every asker a case names', () => {
    const named = cases.flatMap(({ asker }) => (asker === undefined ? [] : [asker]));

    expect(named.length).toBeGreaterThan(0);
    expect(named.filter((asker) => world.askers[asker] === undefined)).toEqual([]);
  });

  it('gives the map facts of every point it uses, as the shared seed answers them', async () => {
    expect(pointsUsed.filter((point) => !data.mappedPoints.some((mapped) => samePoint(mapped, point)))).toEqual([]);

    expect(await mapFacts(app, database.url)).toEqual(data.mappedPoints);
  });
});
