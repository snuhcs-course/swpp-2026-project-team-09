/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-10-28  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { parse } from 'yaml';
import {
  acceptedIds,
  activeAt,
  fingerprintOf,
  goldFileSchema,
  type GoldItem,
  itemsOf,
  loadGold,
  updatesOf,
} from '../eval/replay/gold.ts';
import { type PlaceDto } from '../src/places/dto/place.dto.js';

// The gold file of the replay (P07 ticket 05): its schema, its sets and how its targets name Places.

describe('The gold file', () => {
  it('loads, with the development set only for now, every item collected on a day', () => {
    const items = loadGold();

    expect(items.length).toBeGreaterThanOrEqual(40);
    expect(new Set(items.map(({ set }) => set))).toEqual(new Set(['development']));
    expect(items.filter(({ accept }) => accept.length === 0).length).toBeGreaterThanOrEqual(15);
    expect(items.map(({ words }) => words)).toEqual(
      expect.arrayContaining(['학관', '중도', '관정', '농생대', '학식', '체육', 'ㅎㄱ', 'ㅎ관', '공대', '윗공대']),
    );
  });

  it('scores one set at a time, and has no test set to score yet', () => {
    const items = loadGold();

    expect(itemsOf(items, 'development')).toEqual(items);
    expect(() => itemsOf(items, 'test')).toThrow('--development');
    expect(itemsOf([...items, { ...items[0], set: 'test' }], 'test')).toHaveLength(1);
  });

  it('reads a number as a Place number, and refuses a day, a set or a key it does not know', () => {
    const [parsed] = goldFileSchema.parse(
      parse('- { words: 301동, accept: [301, 25-1], collected: 2026-10-28, set: test }'),
    );

    expect(parsed?.accept).toEqual(['301', '25-1']);
    for (const bad of [
      '- { words: 학관, accept: [], collected: 2026-10-32, set: test }',
      '- { words: 학관, accept: [], collected: 2026-10-28, set: train }',
      '- { words: 학관, accept: [], collected: 2026-10-28, set: test, collector: 누구 }',
    ]) {
      expect(() => goldFileSchema.parse(parse(bad))).toThrow();
    }
  });
});

describe('A knowledge update', () => {
  const before: GoldItem = {
    words: '학관',
    accept: ['학생회관'],
    collected: '2026-10-28',
    set: 'test',
    until: '2026-12-01',
  };
  const after: GoldItem = { words: '학관', accept: ['63'], collected: '2026-12-01', set: 'test', from: '2026-12-01' };
  const always: GoldItem = { words: '중도', accept: [], collected: '2026-10-28', set: 'test' };

  it('holds from its day and before its end, in Korea, and counts as an update', () => {
    const items = [before, after, always];

    expect(activeAt(items, new Date('2026-11-30T14:59:59Z'))).toEqual([before, always]);
    expect(activeAt(items, new Date('2026-11-30T15:00:00Z'))).toEqual([after, always]);
    expect(updatesOf(items)).toBe(2);
    expect(() =>
      goldFileSchema.parse(
        parse('- { words: 학관, accept: [], collected: 2026-10-28, set: test, from: 2026-12-01, until: 2026-11-01 }'),
      ),
    ).toThrow('until');
  });

  it('is in the fingerprint of the set, which ignores the order of the items and their notes', () => {
    const items = [before, after, always];

    expect(fingerprintOf(items)).toMatch(/^[0-9a-f]{12}$/u);
    expect(fingerprintOf([always, { ...after, note: '63동' }, before])).toBe(fingerprintOf(items));
    expect(fingerprintOf([before, always])).not.toBe(fingerprintOf(items));
    expect(fingerprintOf([before, { ...after, from: '2026-12-02' }, always])).not.toBe(fingerprintOf(items));
  });
});

function place(id: string, name: string, number: string | null): PlaceDto {
  return { id, name, number, latitude: 37.46, longitude: 126.95 };
}

const places = [
  place('dorm-919', '(관악사)학부 생활관', '919'),
  place('dorm-921', '(관악사)학부 생활관', '921'),
  place('centre', '학생회관', '63'),
  place('osm-901', '901', '901'),
  place('other-901', '다른 건물', '901'),
];

function item(accept: string[]): GoldItem {
  return { words: '학관', accept, collected: '2026-10-28', set: 'development' };
}

function idsOf(accept: string[]): Set<string> | undefined {
  return acceptedIds([item(accept)], places)[0];
}

describe("A gold item's targets", () => {
  it('name every Place of that name, else every Place of that number', () => {
    expect(idsOf(['(관악사)학부 생활관', '63'])).toEqual(new Set(['dorm-919', 'dorm-921', 'centre']));
    expect(idsOf(['901'])).toEqual(new Set(['osm-901']));
    expect(idsOf([])).toEqual(new Set());
  });

  it('fail on every name or number no Place has at once', () => {
    expect(() => acceptedIds([item(['학생회관 본관']), item(['63', '999'])], places)).toThrow(/학생회관 본관\n.*999/u);
  });
});
