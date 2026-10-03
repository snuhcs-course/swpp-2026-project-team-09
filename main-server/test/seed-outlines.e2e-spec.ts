import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inject } from 'vitest';
import { type z } from 'zod';
import { type Position } from '../src/common/geometry.js';
import { readSeedFile, SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { loadSeed } from '../src/load-seed.js';
import { toLongitudeLatitude } from '../scripts/national-map.ts';
import { createDatabase } from './containers.js';
import { NATIONAL_MAP, outlines, outlinesFileSchema } from './seed-outlines.js';

// Which outlines the rules of the seed command give a Place, on a database of this file's own.
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

async function outlinesOfPlace(number: string): Promise<unknown> {
  return (await prisma.place.findFirstOrThrow({ where: { number } })).outlines;
}

async function outlinesOfPlaceNamed(name: string): Promise<unknown> {
  return (await prisma.place.findFirstOrThrow({ where: { name } })).outlines;
}

describe("Converting the national map's coordinates", () => {
  it('gives the longitude and latitude that PROJ gives', () => {
    // The first point of 151동미술관. The layer has it at 951361.3516 m east and 1940927.4663 m north in EPSG:5179, which
    // PROJ converts to 126.94997671°E 37.46628095°N.
    expect(toLongitudeLatitude([951_361.3516, 1_940_927.4663])).toEqual([126.9499767, 37.466281]);
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

  it('gives it the nearest polygon within 10 m that no Place has', async () => {
    // 자연대 생명과학부 시약보관창고 (506동), 1.9 m outside a polygon without a label.
    expect(await outlinesOfPlace('506')).toEqual(await outlines('B0010000000RF2EYW'));
    // 인문관연결동 (250동) lies 1.1 m from the polygon of 인문관2, which 2동 has, and as near to one without a label,
    // between 인문관1 and 인문관2.
    expect(await outlinesOfPlace('250')).toEqual(await outlines('B0010000000RF235S'));
    // 다목적차량보관소 (332동) lies 2.8 m from the polygon of 330동 and 5.4 m from one without a label.
    expect(await outlinesOfPlace('332')).toEqual(await outlines('B0010000000RETC1N'));
  });

  it('gives a polygon to the nearer of two Places beside it, and the other none', async () => {
    // 반도체연구소화공약품창고 (104-2동) is 0.1 m from a polygon and 반도체연구소수소창고 (104-3동) 6.7 m. No other
    // polygon lies within 10 m of 104-3동.
    expect(await outlinesOfPlace('104-2')).toEqual(await outlines('B0010000000RF2992'));
    expect(await outlinesOfPlace('104-3')).toEqual([]);
  });

  it('gives it none where the layer draws only a wall-less structure, which the seed leaves out', async () => {
    // 물리관연결동 (254동) lies inside B0010000000RETCI4, which the layer classes as wall-less.
    await expect(outlines('B0010000000RETCI4')).rejects.toThrow('The seed holds no outline');
    expect(await outlinesOfPlace('254')).toEqual([]);
  });

  it('gives it none where no polygon lies within 10 m', async () => {
    // 붉은광장, a square without a number, 16 m from the nearest polygon.
    expect(await outlinesOfPlaceNamed('붉은광장')).toEqual([]);
  });
});

// A square around a position, as a polygon of the national map without a label.
function squareAround(
  [longitude, latitude]: [number, number],
  id: string,
  halfSide: number,
): z.infer<typeof outlinesFileSchema>['features'][number] {
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
    [-1, -1],
  ].map(([east = 0, north = 0]): [number, number] => [longitude + east * halfSide, latitude + north * halfSide]);
  return { id, properties: { label: null }, geometry: { type: 'Polygon', coordinates: [corners] } };
}

const ringOf = ({ geometry }: ReturnType<typeof squareAround>): Position[] =>
  geometry.coordinates[0].map(([longitude, latitude]) => ({ latitude, longitude }));

describe('Linking against polygons added to a copy of the seed', () => {
  afterEach(async () => {
    await cp(join(SEED_DIRECTORY, NATIONAL_MAP), join(correctedSeed, NATIONAL_MAP));
  });

  it('gives a Place whose position two polygons hold the larger one', async () => {
    // 우석경제관's own polygon is 1,450 m². After it come a square of about 110 m a side and one of about 20 m.
    const seed = await readSeedFile(SEED_DIRECTORY, NATIONAL_MAP, outlinesFileSchema);
    const larger = squareAround([126.955673, 37.465509], 'larger', 0.0006);
    seed.features.push(larger, squareAround([126.955673, 37.465509], 'smaller', 0.0001));
    await writeFile(join(correctedSeed, NATIONAL_MAP), JSON.stringify(seed));

    await loadSeed(prisma, correctedSeed);

    expect(await outlinesOfPlace('223')).toEqual([ringOf(larger)]);
  });

  it('links a Place without a number by its position, as any other', async () => {
    // 붉은광장 has no number for a label to name. A square of about 60 m a side around its position holds it, with
    // its walls beyond the 10 m of the next rule.
    const seed = await readSeedFile(SEED_DIRECTORY, NATIONAL_MAP, outlinesFileSchema);
    const square = squareAround([126.9512305146599, 37.45587314704376], 'square', 0.0003);
    seed.features.push(square);
    await writeFile(join(correctedSeed, NATIONAL_MAP), JSON.stringify(seed));

    await loadSeed(prisma, correctedSeed);

    expect(await outlinesOfPlaceNamed('붉은광장')).toEqual([ringOf(square)]);
  });
});
