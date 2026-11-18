/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { CAMPUS_TERMS, CAMPUS_TERMS_RULES, campusTermsRules } from '../src/assistant/campus-terms.js';

// The campus short names are data, rendered into a fragment of the chat's system prompt (P15 ticket 51).

describe('The campus short names', () => {
  it('render every short name with what it means', () => {
    for (const { shortNames, means, note } of CAMPUS_TERMS) {
      expect(CAMPUS_TERMS_RULES).toContain(`- ${shortNames.join(', ')}: ${means}.`);
      for (const name of shortNames) {
        expect(CAMPUS_TERMS_RULES).toContain(name);
      }
      if (note !== undefined) {
        expect(CAMPUS_TERMS_RULES).toContain(note);
      }
    }
  });

  it('hold the first entries', () => {
    expect(CAMPUS_TERMS.flatMap(({ shortNames }) => shortNames)).toEqual([
      '학관',
      '윗공대',
      '아랫공대',
      '과방',
      '버들골',
      '풍산마당',
      '긱사',
      '긱',
      '천식',
      '종운',
      '긱운',
      '긱삼',
      '중도',
    ]);
  });

  it('change by one line, and only that, when an entry is added', () => {
    const added = campusTermsRules([
      ...CAMPUS_TERMS,
      { shortNames: ['예시'], means: '예시관 (999동)', note: 'An example.' },
    ]);

    expect(added).toContain('- 예시: 예시관 (999동). An example.');
    expect(added.replace('\n- 예시: 예시관 (999동). An example.', '')).toBe(CAMPUS_TERMS_RULES);
  });
});

// The seed the tools find Places, Restaurants and shuttle stops in (README.md: Seed data), read as plainly as possible.
function seed<Schema extends z.ZodType>(file: string, schema: Schema): z.infer<Schema> {
  return schema.parse(JSON.parse(readFileSync(new URL(`../seed/${file}`, import.meta.url), 'utf8')));
}

const seedPlace = z.object({ number: z.string().nullable(), name: z.string() });

interface SeedPlace {
  number: string | null;
  name: string;
}

function seedPlaces(): SeedPlace[] {
  const campusMap = seed(
    'campus-map-places.json',
    z.object({ rows: z.array(z.object({ inst_kor_nm: z.string(), vil_dong_nm: z.string().nullable() })) }),
  );
  const national = seed('national-map-places.json', z.object({ places: z.array(seedPlace) }));
  const openStreetMap = seed('openstreetmap-places.json', z.object({ places: z.array(seedPlace) }));
  return [
    // `관악 300동[유회진 학술정보관]` is the Place 유회진 학술정보관, as the seed reads it.
    ...campusMap.rows.map(({ inst_kor_nm: name, vil_dong_nm: number }) => ({
      number,
      name: /^관악 \S+동\[(.+)\]$/u.exec(name)?.[1] ?? name,
    })),
    ...national.places,
    ...openStreetMap.places,
  ];
}

// Each "name (N동)" an entry's meaning gives.
function numberedNames(means: string): { name: string; number: string }[] {
  return [...means.matchAll(/([^,:;]+?) \((\d+(?:-\d+)?)동\)/gu)].map((match) => ({
    name: (match[1] ?? '').trim().replace(/^(?:and|among them) /u, ''),
    number: match[2] ?? '',
  }));
}

describe('The campus short names against the seed', () => {
  const places = seedPlaces();
  const stops = new Set(
    seed('shuttle-stops.json', z.object({ stops: z.array(z.object({ name: z.string() })) })).stops.map(
      ({ name }) => name,
    ),
  );
  // The entries that name a Place without its number, each with what the tools find for it.
  const unnumbered: Record<string, () => boolean> = {
    종운: () => places.some(({ name }) => name === '종합운동장'),
    긱운: () => places.some(({ name }) => name === '관악사운동장'),
    긱삼: () => stops.has('기숙사삼거리') && !places.some(({ name }) => name === '기숙사삼거리'),
    중도: () => places.some(({ name }) => name.startsWith('중앙도서관')),
    긱사: () => places.some(({ name }) => name.startsWith('(관악사)')),
  };
  // The entries that name no Place.
  const noPlace = new Set(['과방', '천식']);

  it.each(CAMPUS_TERMS.map((term) => [term.shortNames[0] ?? '', term] as const))(
    '%s names Places the seed has, by the names and numbers the tools find',
    (first, { means }) => {
      const named = numberedNames(means);
      for (const { name, number } of named) {
        expect(places.filter((place) => place.number === number).map((place) => place.name)).toContain(name);
      }
      const check = unnumbered[first];
      if (check !== undefined) {
        expect(check()).toBe(true);
      }
      // Every entry is checked one way or another, or names no Place.
      expect(named.length > 0 || check !== undefined || noPlace.has(first)).toBe(true);
    },
  );
});
