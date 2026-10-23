/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions: a place naming one Place, several, none or somewhere else, by README.md's rules for Global Events, on the
// Places of the seed's files and the places of the worker's saved event pages (worker-server/test/pages), some changed.

import { z } from 'zod';
import { readCampusBoundary } from '../src/common/campus-boundary.js';
import { readSeedFile, SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { namedPlace } from '../src/global-events/named-place.js';
import { type PlaceDto } from '../src/places/dto/place.dto.js';

const campusMapFile = z.object({
  rows: z.array(
    z.object({
      inst_seq: z.number(),
      inst_kor_nm: z.string(),
      vil_dong_nm: z.string().nullable(),
      lat_val: z.coerce.number(),
      lon_val: z.coerce.number(),
    }),
  ),
});
const openStreetMapFile = z.object({
  places: z.array(
    z.object({ id: z.string(), number: z.string(), name: z.string(), latitude: z.number(), longitude: z.number() }),
  ),
});
const nationalMapFile = z.object({
  places: z.array(z.object({ outline: z.string(), number: z.string().nullable(), name: z.string() })),
});
const outlinesFile = z.object({
  features: z.array(
    z.object({
      id: z.string(),
      geometry: z.object({ coordinates: z.tuple([z.array(z.tuple([z.number(), z.number()]))]) }),
    }),
  ),
});

// The Places the seed loads (README.md: Seed data): the campus map's inside the Campus Boundary, without its test row
// and with `관악 223동[우석경제관]` read as 우석경제관, OpenStreetMap's two, and the national map's four.
async function seedPlaces(): Promise<PlaceDto[]> {
  const boundary = await readCampusBoundary(SEED_DIRECTORY);
  const { rows } = await readSeedFile(SEED_DIRECTORY, 'campus-map-places.json', campusMapFile);
  const openStreetMap = await readSeedFile(SEED_DIRECTORY, 'openstreetmap-places.json', openStreetMapFile);
  const nationalMap = await readSeedFile(SEED_DIRECTORY, 'national-map-places.json', nationalMapFile);
  const { features } = await readSeedFile(SEED_DIRECTORY, 'national-map-outlines.geojson', outlinesFile);
  const campusMap = rows
    .filter(({ inst_kor_nm }) => inst_kor_nm !== 'Test')
    .map((row) => ({
      id: `campus_map:${row.inst_seq}`,
      number: row.vil_dong_nm,
      name: /^관악 \S+동\[(.+)\]$/u.exec(row.inst_kor_nm)?.[1] ?? row.inst_kor_nm,
      latitude: row.lat_val,
      longitude: row.lon_val,
    }))
    .filter((place) => boundary.contains(place));
  // At a corner of its polygon, not its middle as in the database: namedPlace reads no position.
  const drawn = nationalMap.places.map(({ outline, number, name }) => {
    const [longitude, latitude] = features.find(({ id }) => id === outline)?.geometry.coordinates[0][0] ?? [0, 0];
    return { id: `national_map:${outline}`, number, name, latitude, longitude };
  });
  return [
    ...campusMap,
    ...openStreetMap.places.map(({ id, number, name, latitude, longitude }) => ({
      id: `openstreetmap:${id}`,
      number,
      name,
      latitude,
      longitude,
    })),
    ...drawn,
  ];
}

let places: PlaceDto[];

beforeAll(async () => {
  places = await seedPlaces();
});

// The Places of posts 176525 and 176561, as campus-map-places.json writes them.
const place132 = { number: '132', name: '뉴미디어통신공동연구소' };
const place46 = { number: '46', name: '천문관측소' };

// The Place a text names, by its number and name.
function named(text: string | null): Pick<PlaceDto, 'number' | 'name'> | null {
  const place = namedPlace(text, places);
  return place === null ? null : { number: place.number, name: place.name };
}

describe('The Places seed, as these tests read it', () => {
  it('its files → the 230 Places that test/seed.integration.test.ts finds loaded', () => {
    expect(places).toHaveLength(230);
  });
});

describe('namedPlace, on a text that names one Place', () => {
  it("a Place's name with its building number (post 176525) → that Place", () => {
    expect(named('뉴미디어통신공동연구소 이충웅홀(132동 103호)')).toEqual(place132);
  });

  it.each([
    ['post 176561', '서울대학교 46동 천문대', place46],
    [
      "post 176516, the number of OpenStreetMap's Place",
      '서울대학교 관악캠퍼스 71-1동 체육문화연구동 206호 대형 강의실',
      { number: '71-1', name: '체육문화교육연구동(71-1동)' },
    ],
  ])("a number alone with the university's name, %s → the Place of that number", (_post, text, place) => {
    expect(named(text)).toEqual(place);
  });

  it("the campus's own street address, 관악로 1 → the Place", () => {
    expect(named('서울특별시 관악구 관악로 1 서울대학교 46동 천문대')).toEqual(place46);
  });

  it('a Place beside an online room → that Place', () => {
    expect(named('뉴미디어통신공동연구소 이충웅홀(132동 103호) & Zoom 온라인 회의실')).toEqual(place132);
  });

  it('one Place in two parts of the text → that Place', () => {
    expect(named('서울대학교 46동 천문대, 46동 앞마당')).toEqual(place46);
  });

  it.each([
    ["the first of post 176558's places", '서울대학교종합운동장', { number: null, name: '종합운동장' }],
    ["README.md's example", '서울대학교미술관 2~3F 전시실', { number: '151', name: '미술관' }],
  ])("the campus's name glued to a Place's name, %s → that Place", (_as, text, place) => {
    expect(named(text)).toEqual(place);
  });
});

describe('namedPlace, on a text that names no Place for certain', () => {
  it('no place read → no Place', () => {
    expect(named(null)).toBeNull();
  });

  it.each([
    ['a number', '46동 천문대'],
    ['a name', '종합운동장'],
  ])("%s alone, without the university's name → no Place", (_as, text) => {
    expect(named(text)).toBeNull();
  });

  it.each([
    ['another campus', 176_561, '서울대학교 연건캠퍼스 46동 천문대'],
    ['a hospital', 176_561, '서울대학교병원 46동 천문대'],
    ['a station', 176_561, '서울대입구역 46동 천문대'],
    ['another university', 176_525, '연세대학교 뉴미디어통신공동연구소 이충웅홀(132동 103호)'],
    ["a street address other than the campus's", 176_561, '서울특별시 관악구 남부순환로 1820 서울대학교 46동 천문대'],
  ])("%s, with post %i's place → no Place", (_where, _post, text) => {
    expect(named(text)).toBeNull();
  });

  it.each(['온라인 (Zoom)', '비대면 화상 강의'])('an online event, %s → no Place', (text) => {
    expect(named(text)).toBeNull();
  });

  it.each([
    ['five by name (post 176558)', '종합운동장, 보조운동장, 종합체육관, 기숙사삼거리 풋살장, 본부 테니스코트'],
    ['two by number', '서울대학교 46동 및 132동'],
    ['a number and the name of another Place', '서울대학교 46동 뉴미디어통신공동연구소'],
  ])('several places in one text, %s → no Place', (_as, text) => {
    expect(named(text)).toBeNull();
  });
});
