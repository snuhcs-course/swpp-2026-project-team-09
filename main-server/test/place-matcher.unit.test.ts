/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-26  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { readSeedFile, SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { type PlaceDto } from '../src/places/dto/place.dto.js';
import { CuratedGroups } from '../src/places/place-groups.js';
import { PlaceIndex } from '../src/places/place-index.js';

// The tiered matcher (P07 ticket 01) over the campus map's names of the seed, as the resolver reads them. The tiers
// never mix, the first with hits answers, and several hits stay several.

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

async function seedPlaces(): Promise<PlaceDto[]> {
  const { rows } = await readSeedFile(SEED_DIRECTORY, 'campus-map-places.json', campusMapFile);
  return rows
    .filter(({ inst_kor_nm }) => inst_kor_nm !== 'Test')
    .map((row) => ({
      id: `campus_map:${row.inst_seq}`,
      number: row.vil_dong_nm,
      name: /^관악 \S+동\[(.+)\]$/u.exec(row.inst_kor_nm)?.[1] ?? row.inst_kor_nm,
      latitude: row.lat_val,
      longitude: row.lon_val,
    }));
}

const USER = 'user-1';
let places: PlaceDto[];
let index: PlaceIndex;

beforeAll(async () => {
  places = await seedPlaces();
  index = new PlaceIndex(places, [new CuratedGroups(places)]);
});

function names(words: string): string[] {
  return index.match(words, USER).places.map(({ name }) => name);
}

describe('tier 1, the exact name or building number', () => {
  it.each(['학생회관', '학생 회관', '63동', '63'])('answers 학생회관 for %s', (words) => {
    expect(index.match(words, USER)).toMatchObject({ tier: 'exact', places: [{ name: '학생회관', number: '63' }] });
  });

  it('reads the name whatever its case and spaces', () => {
    expect(names('sk경영관')).toEqual(['SK경영관']);
    expect(names('중앙도서관본관')).toEqual(['중앙도서관 본관']);
  });

  it('answers every Place of a name several share', () => {
    expect(names('(관악사)학부 생활관')).toHaveLength(7);
  });
});

describe('tier 2, the aliases', () => {
  it('answers the buildings of a curated group, as several, before any generated form', () => {
    const match = index.match('공대', USER);
    expect(match).toMatchObject({ tier: 'alias', source: 'curated' });
    expect(match.places.length).toBeGreaterThan(1);
    expect(match.places.map(({ number }) => number)).toEqual(expect.arrayContaining(['301', '302']));
    expect(index.match('자연대', USER)).toMatchObject({ tier: 'alias', source: 'curated' });
  });

  it('drops a building number the catalog lacks, so that no hit names a Place that is not there', () => {
    const groups = new CuratedGroups(places, [{ words: ['없는묶음'], numbers: ['63', '99999'] }]);
    expect(groups.lookup('없는묶음')).toEqual([{ placeId: 'campus_map:80', source: 'curated' }]);
    expect(groups.lookup('공대')).toEqual([]);
  });
});

describe('tier 3, a generated form or its 초성', () => {
  it('answers 학관 with 학생회관 first, and the other Places that shorten to it, never one that only holds it', () => {
    const match = index.match('학관', USER);
    expect(match.tier).toBe('generated');
    expect(match.places[0]?.name).toBe('학생회관');
    expect(new Set(match.places.map(({ name }) => name))).toEqual(
      new Set(['학생회관', '(관악사)학부 생활관', '유회진 학술정보관']),
    );
  });

  it('answers all consonants by the 초성 of the names and their forms', () => {
    expect(names('ㅎㅅㅎㄱ')).toEqual(['학생회관']);
    const match = index.match('ㅎㄱ', USER);
    expect(match.tier).toBe('generated');
    expect(match.places.length).toBeGreaterThan(10);
    expect(match.places.slice(0, 10).map(({ name }) => name)).toContain('학생회관');
  });

  it('compares a mixed form position by position', () => {
    expect(names('ㅎ관')).toContain('학생회관');
    expect(names('학ㄱ')).toContain('학생회관');
    expect(names('ㅈ도')).toEqual(expect.arrayContaining(['중앙도서관 본관', '중앙도서관 관정관']));
  });

  it('answers one for a form only one Place shortens to', () => {
    expect(index.match('관정', USER)).toMatchObject({ tier: 'generated', places: [{ name: '중앙도서관 관정관' }] });
    expect(names('학식')).toEqual(['제3학생식당']);
  });

  it('answers the Places a shared name without its number stands for', () => {
    const matched = names('공학관');
    expect(matched).toHaveLength(10);
    expect(matched.every((name) => name.includes('공학관'))).toBe(true);
    expect(names('인문관')).toContain('두산인문관');
  });
});

describe('tiers 4 and 5, looser matches', () => {
  it('answers the names whose syllables hold the words in order from the first', () => {
    expect(index.match('중앙도', USER)).toMatchObject({
      tier: 'subsequence',
      places: [{ name: '중앙도서관 본관' }, { name: '중앙도서관 관정관' }],
    });
  });

  it('answers the names within one jamo', () => {
    const match = index.match('학곤', USER);
    expect(match.tier).toBe('distance');
    expect(match.places.map(({ name }) => name)).toContain('학생회관');
  });

  it('answers nothing for words no Place is near', () => {
    expect(index.match('없는건물', USER)).toEqual({ tier: null, source: null, places: [] });
    expect(index.match('   ', USER)).toEqual({ tier: null, source: null, places: [] });
  });
});

describe('the forms', () => {
  it('are computed from the catalog when the index is built', () => {
    expect(index.formsOf('campus_map:80')).toEqual(expect.arrayContaining(['학관', '학생', '학회', '학생회']));
  });
});
