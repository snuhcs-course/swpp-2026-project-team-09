/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { Server } from 'node:http';
import { inject, type ProvidedContext } from 'vitest';
import { parse } from 'yaml';
import { z } from 'zod';
import { casesIn, loadCases, WORLD_CLOCKS } from '../eval/cases.ts';
import { FIXED_SET } from '../eval/fixed-set.ts';
import { seedP5World } from '../eval/p5/world.ts';
import { p5WorldData } from '../eval/p5/world-data.ts';
import { type World } from '../eval/world.ts';
import { metresBetween, type Position } from '../src/common/geometry.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { connect, type SeededDatabase, seededDatabase } from './containers.js';
import { unseeded } from './eval-refs.ts';
import { refuseMatchServer } from './match-server.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// The P05 suite's cases, world and thresholds (P05 ticket 02), without a model: the set is the ticket's, the thresholds
// cover it, and every seed name a case gives is something of that kind in the world, seeded into a database of its own.
// The answers are worked by hand, and a run scores them.

const cases = casesIn(loadCases(), 'p5');
const data = p5WorldData();

const thresholdSchema = z.strictObject({
  id: z.string(),
  metric: z.string(),
  measure: z.string(),
  kind: z.enum(['floor', 'target']),
  comparator: z.enum(['>=', '<=', '=']),
  value: z.number(),
  declared: z.iso.date().or(z.date()),
  note: z.string().optional(),
  revises: z.string().optional(),
  reason: z.string().optional(),
});

const suiteSchema = z.looseObject({
  world: z.literal('p5'),
  tags: z.record(
    z.string(),
    z.array(z.union([z.string(), z.strictObject({ case: z.string(), seed: z.string().nullable() })])),
  ),
  superseded: z.array(z.strictObject({ case: z.string(), heldBy: z.string() })),
  thresholds: z.array(thresholdSchema),
});

const suite = suiteSchema.parse(parse(readFileSync(new URL('../eval/p5/suite.yaml', import.meta.url), 'utf8')));

const ids = cases.map(({ id }) => id);

const THRESHOLD_METRICS = [
  'J1',
  'J1-P',
  'J2',
  'J3a',
  'J3b',
  'J4',
  'J6',
  'J7',
  'J8',
  'J9',
  'J10',
  'G1',
  'E1',
  'E2',
  'E3',
  'E4',
  'E5',
  'E7',
  'E8',
];

interface StoredPlace extends Position {
  name: string;
  number: string | null;
}

// The world's Places by seed name, as the shared seed stores them.
function placesOf(stored: readonly StoredPlace[]): { name: string; place: StoredPlace }[] {
  return Object.entries(data.places).flatMap(([name, number]) => {
    const place = stored.find((found) => found.name === name && found.number === number);
    return place === undefined ? [] : [{ name, place }];
  });
}

// Every pair of the world's Places under 500 m.
function placeDistances(stored: readonly StoredPlace[]): object[] {
  const named = placesOf(stored);
  return named.flatMap(({ name: a, place: from }, index) =>
    named.slice(index + 1).flatMap(({ name: b, place: to }) => {
      const metres = Math.round(metresBetween(from, to));
      return metres < 500 ? [{ between: [a, b], metres }] : [];
    }),
  );
}

// How far each listed point is from each listed Place.
function pointDistances(stored: readonly StoredPlace[]): object[] {
  const named = placesOf(stored);
  const points = data.quests.flatMap((quest) => ('place' in quest && 'latitude' in quest.place ? [quest.place] : []));
  return data.pointDistances.map(({ label, place: name }) => {
    const point = points.find((one) => one.label === label);
    const place = named.find((one) => one.name === name)?.place;
    const metres = point === undefined || place === undefined ? null : Math.round(metresBetween(point, place));
    return { label, place: name, metres };
  });
}

describe('The P05 suite', () => {
  it('runs every case 3 times, in fixed histories, none of them live', () => {
    expect(cases.filter(({ repeat, live }) => repeat !== 3 || live)).toEqual([]);
  });

  it.each(['L', 'P', 'T1', 'T2', 'H', 'S', 'N', 'R', 'O', 'B'])('holds at least five cases of subset %s', (subset) => {
    expect(suite.tags[subset]?.length).toBeGreaterThanOrEqual(5);
  });

  it('holds six cases of subset E and three traps of J3a', () => {
    expect(suite.tags.E).toHaveLength(6);
    expect(suite.tags.J3a).toHaveLength(3);
  });

  it('tags only cases it holds, and every search case with a subset', () => {
    const tagged = Object.values(suite.tags)
      .flat()
      .map((tag) => (typeof tag === 'string' ? tag : tag.case));

    expect(tagged.filter((id) => !ids.includes(id))).toEqual([]);
    expect(ids.filter((id) => id.startsWith('search-') && !tagged.includes(id))).toEqual([]);
  });

  it('commits a floor or target for every metric, each once', () => {
    expect([...new Set(suite.thresholds.map(({ metric }) => metric))]).toEqual(THRESHOLD_METRICS);
    const entries = suite.thresholds.map(({ id }) => id);
    expect(new Set(entries).size).toBe(entries.length);
  });

  it('lists superseded P19 cases of the fixed set, each with a P05 case', () => {
    const fixed = new Set(Object.values(FIXED_SET).flat());

    expect(suite.superseded.filter(({ case: id, heldBy }) => !fixed.has(id) || !ids.includes(heldBy))).toEqual([]);
  });
});

describe('The world the cases refer to', () => {
  const model = new ScriptedModel();
  let database: SeededDatabase<ProvidedContext['settings']>;
  let app: INestApplication<Server>;
  let world: World;

  beforeAll(async () => {
    database = await seededDatabase(inject('settings'));
    app = await startApp(database.settings, [], refuseKakao, refuseMatchServer, model.model);
    vi.spyOn(app.get<Clock>(CLOCK), 'now').mockImplementation(() => new Date(WORLD_CLOCKS.p5));
    world = await seedP5World(app, database.url);
  });

  afterAll(async () => {
    await app.close();
    await database.drop();
  });

  it('holds every seed name a case gives, as the kind of thing the case takes it for', () => {
    expect(unseeded(cases, world)).toEqual([]);
  });

  it('holds what the ticket asks for, as the rules read it', async () => {
    const prisma = connect(database.url);
    const held = await prisma.quest.findMany({ include: { holders: true } });
    await prisma.$disconnect();
    const byTitle = new Map(held.map((quest) => [quest.title, quest]));

    for (const { title, holders, capacity } of data.quests) {
      expect([title, byTitle.get(title)?.holders.length, byTitle.get(title)?.capacity]).toEqual([
        title,
        holders,
        capacity,
      ]);
    }
    expect(data.quests.some(({ holders, capacity }) => holders === capacity)).toBe(true);
  });

  it('gives the distances of its Places and its point as the shared seed places them', async () => {
    const prisma = connect(database.url);
    const stored = await prisma.place.findMany({ where: { name: { in: Object.keys(data.places) } } });
    await prisma.$disconnect();

    expect(placeDistances(stored)).toEqual(data.distances);
    expect(pointDistances(stored)).toEqual(data.pointDistances);
  });
});
