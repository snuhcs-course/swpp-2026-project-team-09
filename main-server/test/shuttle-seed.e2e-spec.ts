import { randomUUID } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inject } from 'vitest';
import { z } from 'zod';
import { SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { loadSeed } from '../src/load-seed.js';
import { connect, migrate } from './containers.js';

// The other test files read the shuttle stops of the shared database. These tests load the seed into a database of
// their own, so that a corrected seed loaded here reaches no other test.
const database = `shuttle_seed_${randomUUID().replaceAll('-', '')}`;
let main: PrismaClient;
let prisma: PrismaClient;
const copies: string[] = [];

beforeAll(async () => {
  const { DATABASE_URL } = inject('settings');
  main = connect(DATABASE_URL);
  await main.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
  const url = new URL(DATABASE_URL);
  url.pathname = `/${database}`;
  migrate(url.toString());
  prisma = connect(url.toString());
});

afterAll(async () => {
  await Promise.all(copies.map((copy) => rm(copy, { recursive: true })));
  await prisma.$disconnect();
  await main.$executeRawUnsafe(`DROP DATABASE "${database}" WITH (FORCE)`);
  await main.$disconnect();
});

const stopsFile = z.looseObject({ stops: z.array(z.looseObject({ name: z.string() })) });

type Stop = z.infer<typeof stopsFile>['stops'][number];

// A copy of the seed in which a person changed the operator's stops.
async function seedWithStops(change: (stops: Stop[]) => Stop[]): Promise<string> {
  const copy = await mkdtemp(join(tmpdir(), 'seed-'));
  copies.push(copy);
  await cp(SEED_DIRECTORY, copy, { recursive: true });
  const file = join(copy, 'shuttle-stops.json');
  const seed = stopsFile.parse(JSON.parse(await readFile(file, 'utf8')));
  await writeFile(file, JSON.stringify({ ...seed, stops: change(seed.stops) }));
  return copy;
}

function stopsInLoopOrder(): Promise<{ id: string; name: string }[]> {
  return prisma.shuttleStop.findMany({ orderBy: { position: 'asc' }, select: { id: true, name: true } });
}

describe('Loading the shuttle seed', () => {
  it("loads the operator's 14 stops in loop order, each at the coordinates of the campus map's stop it is paired with", async () => {
    await loadSeed(prisma);

    const stops = await prisma.shuttleStop.findMany({ orderBy: { position: 'asc' }, omit: { id: true } });
    expect(stops.map(({ name }) => name)).toEqual([
      '정문',
      '법과대',
      '자연대',
      '농생대',
      '38동',
      '신소재공동연구소',
      '302동',
      '301동',
      '유전공학연구소',
      '교수회관',
      '기숙사삼거리',
      '국제대학원',
      '수의대',
      '경영대',
    ]);
    // The campus map's 공대입구, and the position on the drawing that P05 recorded.
    expect(stops[4]).toEqual({
      campusMapCode: 601,
      name: '38동',
      position: 4,
      latitude: 37.454964794994,
      longitude: 126.949840936747,
      drawingLeft: 195,
      drawingTop: 239,
    });
  });

  it('loads the route line as its list of coordinates, from 정문 around the loop back to 정문', async () => {
    await loadSeed(prisma);

    const { line } = await prisma.shuttleRoute.findUniqueOrThrow({ where: { number: '41946' } });
    const points = z
      .array(z.strictObject({ latitude: z.number(), longitude: z.number() }))
      .min(100)
      .parse(line);
    expect(points.at(-1)).toEqual(points[0]);
  });
});

describe('Loading the shuttle seed again', () => {
  it('leaves one set of stops and one route, each with the identifier it had', async () => {
    await loadSeed(prisma);
    const stops = await prisma.shuttleStop.findMany({ orderBy: { id: 'asc' } });
    const routes = await prisma.shuttleRoute.findMany();

    await loadSeed(prisma);

    expect(await prisma.shuttleStop.findMany({ orderBy: { id: 'asc' } })).toEqual(stops);
    expect(await prisma.shuttleRoute.findMany()).toEqual(routes);
  });

  it('keeps the positions on the drawing that the worker read since', async () => {
    await loadSeed(prisma);
    // As a Collection of the route page stores them.
    await prisma.shuttleStop.updateMany({ where: { name: '정문' }, data: { drawingLeft: 160, drawingTop: 30 } });

    await loadSeed(prisma);

    expect(await prisma.shuttleStop.findFirst({ where: { name: '정문' } })).toMatchObject({
      drawingLeft: 160,
      drawingTop: 30,
    });
  });
});

describe('Loading a corrected shuttle seed', () => {
  it('updates a renamed stop in place, so that it keeps its identifier', async () => {
    await loadSeed(prisma);
    const [, lawSchool] = await stopsInLoopOrder();
    // The operator renames a stop on its page, and a person corrects the seed.
    const renamed = await seedWithStops((stops) =>
      stops.map((stop) => (stop.name === '법과대' ? { ...stop, name: '법학관' } : stop)),
    );

    await loadSeed(prisma, renamed);

    expect((await stopsInLoopOrder())[1]).toEqual({ id: lawSchool?.id, name: '법학관' });
    expect(await prisma.shuttleStop.count()).toBe(14);
  });

  it('removes a stop that has left the seed', async () => {
    await loadSeed(prisma);
    const withoutBusiness = await seedWithStops((stops) => stops.filter(({ name }) => name !== '경영대'));

    await loadSeed(prisma, withoutBusiness);

    const names = (await stopsInLoopOrder()).map(({ name }) => name);
    expect(names).toHaveLength(13);
    expect(names).not.toContain('경영대');
  });
});
