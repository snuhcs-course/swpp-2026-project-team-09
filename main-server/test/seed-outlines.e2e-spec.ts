import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inject } from 'vitest';
import { z } from 'zod';
import { type Position } from '../src/common/geometry.js';
import { readSeedFile, SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { loadSeed } from '../src/load-seed.js';
import { createDatabase } from './containers.js';

// Which outlines the seed command gives a Place, on a database of this file's own.
let prisma: PrismaClient;
let drop: () => Promise<void>;
// A copy of the seed that a test changes.
let correctedSeed: string;

beforeAll(async () => {
  ({ prisma, drop } = await createDatabase(inject('settings').DATABASE_URL));
  correctedSeed = await mkdtemp(join(tmpdir(), 'seed-'));
  await cp(SEED_DIRECTORY, correctedSeed, { recursive: true });
});

afterAll(async () => {
  await rm(correctedSeed, { recursive: true });
  await drop();
});

const NATIONAL_MAP = 'national-map-outlines.geojson';
const OPENSTREETMAP = 'openstreetmap-outlines.geojson';

const outlinesFileSchema = z.looseObject({
  features: z.array(
    z.looseObject({
      id: z.string(),
      geometry: z.object({ type: z.string(), coordinates: z.tuple([z.array(z.tuple([z.number(), z.number()]))]) }),
    }),
  ),
});

// The seed's outlines with these identifiers, the national map's or OpenStreetMap's, as a Place stores them.
async function outlines(...ids: string[]): Promise<Position[][]> {
  const files = await Promise.all(
    [NATIONAL_MAP, OPENSTREETMAP].map((file) => readSeedFile(SEED_DIRECTORY, file, outlinesFileSchema)),
  );
  const features = files.flatMap((file) => file.features);
  return ids.map((id) => {
    const outline = features.find((feature) => feature.id === id);
    if (outline === undefined) {
      throw new Error(`The seed holds no outline ${id}`);
    }
    return outline.geometry.coordinates[0].map(([longitude, latitude]) => ({ latitude, longitude }));
  });
}

async function outlinesOfPlace(number: string): Promise<unknown> {
  return (await prisma.place.findFirstOrThrow({ where: { number } })).outlines;
}

async function writeLinks(links: object[]): Promise<void> {
  await writeFile(join(correctedSeed, 'place-outlines.json'), JSON.stringify({ links }));
}

describe("The national map's outlines in the seed", () => {
  it("have the longitude and latitude that PROJ gives for the layer's coordinates", async () => {
    // The first point of 151동미술관. The layer has it at 951361.3516 m east and 1940927.4663 m north in EPSG:5179, which
    // PROJ converts to 126.94997671°E 37.46628095°N.
    const [[point]] = await outlines('B0010000000RF7I8F');

    expect(point).toEqual({ latitude: 37.466281, longitude: 126.9499767 });
  });
});

describe('Linking a Place to the polygons whose label names its number', () => {
  beforeAll(async () => {
    await loadSeed(prisma);
  });

  it('gives a Place the polygon labelled with its number', async () => {
    // 제1공학관, on the polygon labelled `301동제1공학관`.
    expect(await outlinesOfPlace('301')).toEqual(await outlines('B0010000000RETCCY'));
  });

  it('gives a Place drawn as several polygons all of them', async () => {
    // 사회과학관, five polygons labelled `사회과학대학16동`, and 문화관, two labelled `73동문화관`.
    expect(await outlinesOfPlace('16')).toEqual(
      await outlines(
        'B0010000000RF21O9',
        'B0010000000RF21I3',
        'B0010000000SING7W',
        'B0010000000RF211M',
        'B0010000000RF20O8',
      ),
    );
    expect(await outlinesOfPlace('73')).toEqual(await outlines('B0010000000RF22L7', 'B0010000000RF22G2'));
  });

  it('reads the number whole, not as a part of a longer one', async () => {
    // 인문관1 has `인문대학1동` and not `101동아시아연구소`. 자연과학관7 has `자연과학대학25동` and not `자연과학대학25-1동`.
    expect(await outlinesOfPlace('1')).toEqual(await outlines('B0010000000RF234R'));
    expect(await outlinesOfPlace('25')).toEqual(await outlines('B0010000000RETCJ5'));
  });

  it('reads a wing, a letter after the number, as the Place', async () => {
    // (관악사)학부 생활관, three polygons labelled `관악학생생활관919-C동`, `…919-B동` and `…919-A동`.
    expect(await outlinesOfPlace('919')).toEqual(
      await outlines('B0010000000RF245T', 'B0010000000RF241P', 'B0010000000RF23UH'),
    );
  });
});

describe('Linking a Place that no label names', () => {
  beforeAll(async () => {
    await loadSeed(prisma);
  });

  it('gives it the polygon that holds its position, also when another Place has that polygon', async () => {
    // 우석경제관, inside a polygon without a label. 매니지먼트센터 (59-1동), inside `경영대학59동경영전문대학원`, which
    // is one of the two polygons of LG경영관 (59동).
    expect(await outlinesOfPlace('223')).toEqual(await outlines('B0010000000RF1NOU'));
    expect(await outlinesOfPlace('59-1')).toEqual(await outlines('B0010000000RF2DZW'));
    expect(await outlinesOfPlace('59')).toEqual(await outlines('B0010000000RF2E0Y', 'B0010000000RF2DZW'));
  });

  it('gives it the nearest polygon when that is within 10 m and no Place has it', async () => {
    // 자연대 생명과학부 시약보관창고 (506동), 1.9 m outside a polygon without a label.
    expect(await outlinesOfPlace('506')).toEqual(await outlines('B0010000000RF2EYW'));
    // 인문관연결동, 1.1 m outside the polygon of 인문관2.
    expect(await outlinesOfPlace('250')).toEqual([]);
    // 반도체연구소화공약품창고 (104-2동) is 0.1 m from a polygon and 반도체연구소수소창고 (104-3동) 6.7 m: the nearer has it.
    expect(await outlinesOfPlace('104-2')).toEqual(await outlines('B0010000000RF2992'));
    expect(await outlinesOfPlace('104-3')).toEqual([]);
  });

  it('gives it none where the layer draws only a wall-less structure, which the seed leaves out', async () => {
    // 물리관연결동 (254동) lies inside B0010000000RETCI4, which the layer classes as wall-less.
    await expect(outlines('B0010000000RETCI4')).rejects.toThrow('The seed holds no outline');
    expect(await outlinesOfPlace('254')).toEqual([]);
  });

  it('gives a Place, an entry without a number, none', async () => {
    const { outlines: ofPlace } = await prisma.place.findFirstOrThrow({ where: { name: '종합운동장' } });

    expect(ofPlace).toEqual([]);
  });
});

// A square around 우석경제관's position, as a polygon of the national map without a label.
function squareAround223(id: string, halfSide: number): z.infer<typeof outlinesFileSchema>['features'][number] {
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
    [-1, -1],
  ].map(([east = 0, north = 0]): [number, number] => [126.955673 + east * halfSide, 37.465509 + north * halfSide]);
  return { id, properties: { label: null }, geometry: { type: 'Polygon', coordinates: [corners] } };
}

describe('Linking a Place whose position two polygons hold', () => {
  afterAll(async () => {
    await cp(join(SEED_DIRECTORY, NATIONAL_MAP), join(correctedSeed, NATIONAL_MAP));
  });

  it('gives it the larger one', async () => {
    // 우석경제관's own polygon is 1,450 m². After it come a square of about 110 m a side and one of about 20 m.
    const seed = await readSeedFile(SEED_DIRECTORY, NATIONAL_MAP, outlinesFileSchema);
    const larger = squareAround223('larger', 0.0006);
    seed.features.push(larger, squareAround223('smaller', 0.0001));
    await writeFile(join(correctedSeed, NATIONAL_MAP), JSON.stringify(seed));

    await loadSeed(prisma, correctedSeed);

    expect(await outlinesOfPlace('223')).toEqual([
      larger.geometry.coordinates[0].map(([longitude, latitude]) => ({ latitude, longitude })),
    ]);
  });
});

describe('Correcting the outlines', () => {
  it("gives a Place an outline of OpenStreetMap, and takes a Place's outline away", async () => {
    await writeLinks([]);
    await loadSeed(prisma, correctedSeed);
    // The national map does not draw 버들골 풍산마당 (100동). 화학관연결동 (253동) lies inside a polygon without a label.
    expect(await outlinesOfPlace('100')).toEqual([]);
    expect(await outlinesOfPlace('253')).toEqual(await outlines('B0010000000RF26TJ'));

    // With the seed's own corrections.
    await loadSeed(prisma);

    expect(await outlinesOfPlace('100')).toEqual(await outlines('way/193893586'));
    expect(await outlinesOfPlace('253')).toEqual([]);
  });

  it('leaves a Place the one outline a correction names, where a label of the national map is wrong', async () => {
    await writeLinks([]);
    await loadSeed(prisma, correctedSeed);
    // The map labels a polygon at 국제대학원 `104-1동국제대학원`, 1 km from 반도체교육관 (104-1동).
    expect(await outlinesOfPlace('104-1')).toEqual(await outlines('B0010000000RF2ENL', 'B0010000000RF2EB9'));

    await loadSeed(prisma);

    expect(await outlinesOfPlace('104-1')).toEqual(await outlines('B0010000000RF2ENL'));
  });

  it('refuses a correction that names an outline or a Place that the seed does not hold', async () => {
    await writeLinks([{ number: '43', outline: 'way/1', why: 'A mistyped identifier.' }]);
    await expect(loadSeed(prisma, correctedSeed)).rejects.toThrow('way/1');

    await writeLinks([{ number: '1000', outline: null, why: 'A mistyped number.' }]);
    await expect(loadSeed(prisma, correctedSeed)).rejects.toThrow('1000');
  });
});
