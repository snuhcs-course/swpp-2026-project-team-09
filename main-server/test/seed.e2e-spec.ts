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

// The other test files read the buildings of the shared database. These tests load the seed into a database of their
// own, so that a corrected seed loaded here reaches no other test.
const database = `seed_${randomUUID().replaceAll('-', '')}`;
let main: PrismaClient;
let prisma: PrismaClient;

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
  await prisma.$disconnect();
  await main.$executeRawUnsafe(`DROP DATABASE "${database}" WITH (FORCE)`);
  await main.$disconnect();
});

// A numbered building, a wrapped name, a place without a number, and the two buildings from OpenStreetMap.
const loadedEntries = [
  { source: 'campus_map', sourceId: '188', number: '302', name: '제2공학관', latitude: 37.44887, longitude: 126.95265 },
  {
    source: 'campus_map',
    sourceId: '254',
    number: '223',
    name: '우석경제관',
    latitude: 37.465509,
    longitude: 126.955673,
  },
  {
    source: 'campus_map',
    sourceId: '234',
    number: null,
    name: '종합운동장',
    latitude: 37.464779176159,
    longitude: 126.95009153903,
  },
  {
    source: 'openstreetmap',
    sourceId: 'way/456356713',
    number: '71-1',
    name: '체육문화교육연구동(71-1동)',
    latitude: 37.4665138,
    longitude: 126.9526562,
  },
  {
    source: 'openstreetmap',
    sourceId: 'way/482220682',
    number: '901',
    name: '901',
    latitude: 37.4619595,
    longitude: 126.9577853,
  },
];

describe('Loading the seed', () => {
  it("loads the campus map's buildings and places inside the Campus Boundary, and OpenStreetMap's two", async () => {
    await loadSeed(prisma);

    const buildings = await prisma.building.findMany({ omit: { id: true } });
    // 215 numbered buildings and 8 places of the campus map, by .scratch/research/external-sources.md §6.2.
    expect(buildings).toHaveLength(225);
    expect(buildings).toEqual(expect.arrayContaining(loadedEntries));
    expect(buildings.map(({ name }) => name)).not.toContain('Test');
  });

  it('leaves out an entry outside the Campus Boundary', async () => {
    await loadSeed(prisma);

    const loaded = (await prisma.building.findMany()).map(({ sourceId }) => sourceId);
    // 서울대입구역, and 교수아파트1 and 관악 915동 in the wedge that the outline leaves out in the north-east.
    expect(loaded).not.toContain('239');
    expect(loaded).not.toContain('135');
    expect(loaded).not.toContain('248');
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
  let corrected: string;

  beforeAll(async () => {
    corrected = await mkdtemp(join(tmpdir(), 'seed-'));
    await cp(SEED_DIRECTORY, corrected, { recursive: true });
  });

  afterAll(async () => {
    await rm(corrected, { recursive: true });
  });

  it('updates the entry whose name was corrected in place, so that it keeps its identifier', async () => {
    await loadSeed(prisma);
    const where = { source_sourceId: { source: 'campus_map', sourceId: '84' } } as const;
    const building = await prisma.building.findUniqueOrThrow({ where });
    // A person corrects the map's NH농협두레문예관.
    await correctRow(corrected, 84, { inst_kor_nm: '두레문예관' });

    await loadSeed(prisma, corrected);

    expect(await prisma.building.findUniqueOrThrow({ where })).toEqual({ ...building, name: '두레문예관' });
    expect(await prisma.building.count()).toBe(225);
  });
});

// Changes the row of the campus map's seed file that has `instSeq`.
async function correctRow(directory: string, instSeq: number, changes: object): Promise<void> {
  const file = join(directory, 'campus-map-buildings.json');
  const seed = z
    .looseObject({ rows: z.array(z.looseObject({ inst_seq: z.number() })) })
    .parse(JSON.parse(await readFile(file, 'utf8')));
  seed.rows = seed.rows.map((row) => (row.inst_seq === instSeq ? { ...row, ...changes } : row));
  await writeFile(file, JSON.stringify(seed));
}
