/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { inject, type ProvidedContext } from 'vitest';
import { catalogOf } from '../eval/replay/database.ts';
import { type GoldItem } from '../eval/replay/gold.ts';
import { loadRulesFile } from '../eval/replay/induced.ts';
import { replayGold } from '../eval/replay/replay.ts';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { type PlaceDto } from '../src/places/dto/place.dto.js';
import { connect, type SeededDatabase, seededDatabase } from './containers.js';
import { rulesFile } from './rules-file.js';

// Stage E of the replay (P07 ticket 07) on a seeded database of its own: the gold items answered with the rules of a
// file induced before the day, never with those of a run that saw the words.

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.now();

let database: SeededDatabase<ProvidedContext['settings']>;
let prisma: PrismaClient;
let places: PlaceDto[];

beforeAll(async () => {
  database = await seededDatabase(inject('settings'));
  prisma = connect(database.url);
  places = await catalogOf(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
  await database.drop();
});

function item(words: string, accept: string[]): GoldItem {
  return { words, accept, collected: '2026-10-28', set: 'development' };
}

describe('Stage E', () => {
  it('answers with the newest rules induced before the day that never saw the words, and is B otherwise', async () => {
    expect(places.map(({ name }) => name)).toContain('학생회관');
    const earlier = loadRulesFile(rulesFile(new Date(NOW - 2 * DAY_MS), ['뷁중앙도서관관정관']));
    const later = loadRulesFile(rulesFile(new Date(NOW + DAY_MS), []));
    const items = [item('뷁학생회관', ['학생회관']), item('뷁중앙도서관관정관', ['중앙도서관 관정관'])];

    const replay = await replayGold(prisma, items, new Date(NOW), [earlier, later]);

    expect(replay.learned.induced).toBe(1);
    expect(replay.items.map(({ answers }) => [answers.B.result, answers.E.result, answers.E.tier])).toEqual([
      ['none', 'one', 'induced'],
      ['none', 'none', null],
    ]);
    expect(replay.stages.E.top1).toMatchObject({ k: 1, n: 2 });
    const without = await replayGold(prisma, items, new Date(NOW));
    expect(without.items.map(({ answers }) => answers.E.result)).toEqual(['none', 'none']);
  });
});
