import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inject } from 'vitest';
import { SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { loadSeed } from '../src/load-seed.js';
import { createDatabase } from './containers.js';
import { outlines } from './seed-outlines.js';

// Which outlines and Places the hand-kept files of the seed give, on a database of this file's own.
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

// Replaces `place-outlines.json` in the copy of the seed.
async function writePlaceOutlines(places: object[]): Promise<void> {
  await writeFile(join(correctedSeed, 'place-outlines.json'), JSON.stringify({ places }));
}

describe('Giving a Place its outlines in `place-outlines.json`', () => {
  beforeEach(async () => {
    await writePlaceOutlines([]);
    await loadSeed(prisma, correctedSeed);
  });

  it("gives a Place an outline of OpenStreetMap, and takes a Place's outline away", async () => {
    // The national map does not draw 버들골 풍산마당 (100동). 화학관연결동 (253동) lies inside a polygon without a label.
    expect(await outlinesOfPlace('100')).toEqual([]);
    expect(await outlinesOfPlace('253')).toEqual(await outlines('B0010000000RF26TJ'));

    await loadSeed(prisma);

    expect(await outlinesOfPlace('100')).toEqual(await outlines('way/193893586'));
    expect(await outlinesOfPlace('253')).toEqual([]);
  });

  it('leaves a Place the one outline the file names, where a label of the national map is wrong', async () => {
    // The map labels a polygon at 국제대학원 `104-1동국제대학원`, 1 km from 반도체교육관 (104-1동).
    expect(await outlinesOfPlace('104-1')).toEqual(await outlines('B0010000000RF2ENL', 'B0010000000RF2EB9'));

    await loadSeed(prisma);

    expect(await outlinesOfPlace('104-1')).toEqual(await outlines('B0010000000RF2ENL'));
  });

  it('gives a Place several outlines, in the order of the file', async () => {
    // 대학원연구동(2단계) (500동) lies inside the polygon labelled `503동`. The map labels its four parts 501동 to 504동.
    expect(await outlinesOfPlace('500')).toEqual(await outlines('B0010000000RF2G33'));

    await loadSeed(prisma);

    expect(await outlinesOfPlace('500')).toEqual(
      await outlines('B0010000000RF2EZX', 'B0010000000RF2G11', 'B0010000000RF2G33', 'B0010000000RF2G99'),
    );
  });

  it('names a Place without a number by its name', async () => {
    // 종합운동장 with OpenStreetMap's 대운동장, and 테니스장 with its five groups of courts.
    expect(await outlinesOfPlaceNamed('종합운동장')).toEqual([]);

    await loadSeed(prisma);

    expect(await outlinesOfPlaceNamed('종합운동장')).toEqual(await outlines('way/185936754'));
    expect(await outlinesOfPlaceNamed('테니스장')).toEqual(
      await outlines('way/320671088', 'way/320671915', 'way/320671917', 'way/320671919', 'way/320671921'),
    );
  });
});

describe('An entry of `place-outlines.json` that the seed cannot follow', () => {
  it('is refused when it names an outline that the seed does not hold', async () => {
    await writePlaceOutlines([{ number: '43', outlines: ['way/1'], why: 'A mistyped identifier.' }]);

    await expect(loadSeed(prisma, correctedSeed)).rejects.toThrow('way/1');
  });

  it('is refused when it names no Place, or several', async () => {
    await writePlaceOutlines([{ number: '1000', outlines: [], why: 'A mistyped number.' }]);
    await expect(loadSeed(prisma, correctedSeed)).rejects.toThrow('1000');

    await writePlaceOutlines([{ name: '종합운동', outlines: [], why: 'A mistyped name.' }]);
    await expect(loadSeed(prisma, correctedSeed)).rejects.toThrow('종합운동');

    // 900동, 902동 to 906동 and 918동 share this name.
    await writePlaceOutlines([
      { name: '(관악사)대학원 생활관', outlines: [], why: 'A name that several Places bear.' },
    ]);
    await expect(loadSeed(prisma, correctedSeed)).rejects.toThrow('(관악사)대학원 생활관');
  });
});

describe('Adding the Places that the campus map does not list', () => {
  beforeAll(async () => {
    await loadSeed(prisma);
  });

  it('adds a Place at the middle of its polygon of the national map, with that polygon as its outline', async () => {
    // 해동첨단공학관 (303동), on the polygon labelled `해동첨단공학관`. The middle of the polygon's bounding box, worked
    // out apart from the code, is 37.4502695°N 126.9515959°E.
    const place = await prisma.place.findFirstOrThrow({ where: { number: '303' } });

    expect(place).toMatchObject({ origin: 'national_map', originId: 'B0010000000SIJSPM', name: '해동첨단공학관' });
    expect(place.latitude).toBeCloseTo(37.450_269_5, 7);
    expect(place.longitude).toBeCloseTo(126.951_595_9, 7);
    expect(place.outlines).toEqual(await outlines('B0010000000SIJSPM'));
  });

  it('adds one without a number', async () => {
    // 배터리공동연구센터, on the polygon that the map labels `311관`.
    const place = await prisma.place.findFirstOrThrow({ where: { name: '배터리공동연구센터' } });

    expect(place.number).toBeNull();
    expect(place.outlines).toEqual(await outlines('B0010000000SIMQZX'));
  });

  it('refuses one whose polygon the seed does not hold', async () => {
    await writeFile(
      join(correctedSeed, 'national-map-places.json'),
      JSON.stringify({
        places: [{ outline: 'B0010000000XXXXXX', number: '999', name: '없는 건물', why: 'A mistyped identifier.' }],
      }),
    );

    await expect(loadSeed(prisma, correctedSeed)).rejects.toThrow('B0010000000XXXXXX');
  });
});
