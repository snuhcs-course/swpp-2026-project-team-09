import { randomUUID } from 'node:crypto';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inject } from 'vitest';
import { z } from 'zod';
import { readSeedFile, SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { loadSeed } from '../src/load-seed.js';
import { connect, migrate } from './containers.js';

// The other test files read the buildings of the shared database. These tests load the seed into a database of their
// own, so that a corrected seed loaded here reaches no other test.
const databaseName = `seed_${randomUUID().replaceAll('-', '')}`;
// Creates and drops this file's database.
let sharedDatabase: PrismaClient;
let prisma: PrismaClient;

beforeAll(async () => {
  const { DATABASE_URL } = inject('settings');
  sharedDatabase = connect(DATABASE_URL);
  await sharedDatabase.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
  const url = new URL(DATABASE_URL);
  url.pathname = `/${databaseName}`;
  migrate(url.toString());
  prisma = connect(url.toString());
});

afterAll(async () => {
  await prisma.$disconnect();
  await sharedDatabase.$executeRawUnsafe(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  await sharedDatabase.$disconnect();
});

// A numbered building, a wrapped name, a place without a number, the gatehouse 2 m outside the outline, and the two
// buildings from OpenStreetMap.
const loadedEntries = [
  { origin: 'campus_map', originId: '188', number: '302', name: '제2공학관', latitude: 37.44887, longitude: 126.95265 },
  {
    origin: 'campus_map',
    originId: '254',
    number: '223',
    name: '우석경제관',
    latitude: 37.465509,
    longitude: 126.955673,
  },
  {
    origin: 'campus_map',
    originId: '234',
    number: null,
    name: '종합운동장',
    latitude: 37.464779176159,
    longitude: 126.95009153903,
  },
  {
    origin: 'campus_map',
    originId: '131',
    number: '115',
    name: '정문수위실',
    latitude: 37.466303292757,
    longitude: 126.948129302133,
  },
  {
    origin: 'openstreetmap',
    originId: 'way/456356713',
    number: '71-1',
    name: '체육문화교육연구동(71-1동)',
    latitude: 37.4665138,
    longitude: 126.9526562,
  },
  {
    origin: 'openstreetmap',
    originId: 'way/482220682',
    number: '901',
    name: '901',
    latitude: 37.4619595,
    longitude: 126.9577853,
  },
];

describe('Loading the seed', () => {
  it("loads the campus map's buildings and places inside the Campus Boundary, and OpenStreetMap's two", async () => {
    await loadSeed(prisma);

    const buildings = await prisma.building.findMany({ omit: { id: true, outline: true } });
    // 215 numbered buildings and 8 places of the campus map inside the outline, by
    // .scratch/research/external-sources.md §6.2, and the gatehouse within the Boundary's 10 m.
    expect(buildings).toHaveLength(226);
    expect(buildings).toEqual(expect.arrayContaining(loadedEntries));
    expect(buildings.map(({ name }) => name)).not.toContain('Test');
  });

  it('leaves out an entry outside the Campus Boundary', async () => {
    await loadSeed(prisma);

    const loaded = (await prisma.building.findMany()).map(({ originId }) => originId);
    // 서울대입구역, and 교수아파트1 and 관악 915동 in the wedge that the outline leaves out in the north-east.
    expect(loaded).not.toContain('239');
    expect(loaded).not.toContain('135');
    expect(loaded).not.toContain('248');
  });
});

// OpenStreetMap's outline with this identifier, as a building stores it.
async function outlineOf(id: string, directory = SEED_DIRECTORY): Promise<{ latitude: number; longitude: number }[]> {
  const { features } = await readSeedFile(
    directory,
    'openstreetmap-building-outlines.geojson',
    z.object({
      features: z.array(
        z.object({
          id: z.string(),
          geometry: z.object({ coordinates: z.tuple([z.array(z.tuple([z.number(), z.number()]))]) }),
        }),
      ),
    }),
  );
  const outline = features.find((feature) => feature.id === id);
  if (outline === undefined) {
    throw new Error(`The seed holds no outline ${id}`);
  }
  return outline.geometry.coordinates[0].map(([longitude, latitude]) => ({ latitude, longitude }));
}

async function outlineOfBuilding(number: string): Promise<unknown> {
  const { outline } = await prisma.building.findFirstOrThrow({ where: { number } });
  return outline;
}

describe('Loading the outlines of the buildings', () => {
  it('gives a building the outline that holds its position', async () => {
    await loadSeed(prisma);

    // 제1공학관, whose position the campus map places inside OpenStreetMap's outline of that name.
    expect(await outlineOfBuilding('301')).toEqual(await outlineOf('way/228476658'));
  });

  it('gives a building just outside an outline that holds no building that outline', async () => {
    await loadSeed(prisma);

    // 903동, which the campus map places 2 m outside OpenStreetMap's outline named 903.
    expect(await outlineOfBuilding('903')).toEqual(await outlineOf('way/482220678'));
  });

  it('gives no outline to a building beside an outline that holds another building', async () => {
    await loadSeed(prisma);

    // 약대시약창고, 9 m from the outline that holds 43동. OpenStreetMap draws no outline for the store itself.
    expect(await outlineOfBuilding('21-1')).toBeNull();
  });

  it('gives a building inside two outlines the larger one', async () => {
    await loadSeed(prisma);

    // 종합운동장본부석, drawn as a stand of 471 m² with a part of 233 m² laid over it.
    expect(await outlineOfBuilding('149')).toEqual(await outlineOf('way/1469808348'));
  });

  it('gives every building inside one outline that outline', async () => {
    await loadSeed(prisma);

    // 국제대학원, 국제대학원2 and 국제회의동, which OpenStreetMap draws as one building.
    const outline = await outlineOf('way/386889980');
    expect(await outlineOfBuilding('140')).toEqual(outline);
    expect(await outlineOfBuilding('140-1')).toEqual(outline);
    expect(await outlineOfBuilding('140-2')).toEqual(outline);
  });
});

describe('Loading the seed again', () => {
  it('leaves one set of records, each with the identifier it had', async () => {
    await loadSeed(prisma);
    const loaded = await prisma.building.findMany({ orderBy: { id: 'asc' } });

    await loadSeed(prisma);

    expect(await prisma.building.findMany({ orderBy: { id: 'asc' } })).toEqual(loaded);
  });
});

describe('Loading a corrected seed', () => {
  let correctedSeed: string;

  beforeAll(async () => {
    correctedSeed = await mkdtemp(join(tmpdir(), 'seed-'));
    await cp(SEED_DIRECTORY, correctedSeed, { recursive: true });
  });

  afterAll(async () => {
    await rm(correctedSeed, { recursive: true });
  });

  it('updates the entry whose name was corrected in place, so that it keeps its identifier', async () => {
    await loadSeed(prisma);
    const where = { origin_originId: { origin: 'campus_map', originId: '84' } } as const;
    const building = await prisma.building.findUniqueOrThrow({ where });
    const count = await prisma.building.count();
    // A person corrects the map's NH농협두레문예관.
    await correctRow(correctedSeed, 84, { inst_kor_nm: '두레문예관' });

    await loadSeed(prisma, correctedSeed);

    expect(await prisma.building.findUniqueOrThrow({ where })).toEqual({ ...building, name: '두레문예관' });
    expect(await prisma.building.count()).toBe(count);
  });

  it("gives and takes an outline as a person's links say, whatever the positions give", async () => {
    await loadSeed(prisma);
    // 43동 lies inside the outline that OpenStreetMap names 폐기물보관소, and 약대시약창고 beside it.
    expect(await outlineOfBuilding('43')).toEqual(await outlineOf('way/386890918'));
    await writeLinks(correctedSeed, [
      { number: '43', outline: null, why: 'The outline is the waste store, not building 43.' },
      { number: '21-1', outline: 'way/386890918', why: 'The outline is this store.' },
    ]);

    await loadSeed(prisma, correctedSeed);

    expect(await outlineOfBuilding('43')).toBeNull();
    expect(await outlineOfBuilding('21-1')).toEqual(await outlineOf('way/386890918'));
  });

  it('refuses a link to an outline that the seed does not hold', async () => {
    await writeLinks(correctedSeed, [{ number: '43', outline: 'way/1', why: 'A mistyped identifier.' }]);

    await expect(loadSeed(prisma, correctedSeed)).rejects.toThrow('way/1');
  });
});

async function writeLinks(directory: string, links: object[]): Promise<void> {
  await writeFile(join(directory, 'building-outline-links.json'), JSON.stringify({ links }));
}

// Changes the row of the campus map's seed file that has `instSeq`.
async function correctRow(directory: string, instSeq: number, changes: object): Promise<void> {
  const file = 'campus-map-buildings.json';
  const seed = await readSeedFile(
    directory,
    file,
    z.looseObject({ rows: z.array(z.looseObject({ inst_seq: z.number() })) }),
  );
  seed.rows = seed.rows.map((row) => (row.inst_seq === instSeq ? { ...row, ...changes } : row));
  await writeFile(join(directory, file), JSON.stringify(seed));
}
