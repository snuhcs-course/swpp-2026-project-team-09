/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { readFile } from 'node:fs/promises';
import { SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { readSeedTravel, type SeedTravel } from '../src/travel/travel.js';
import { type WalkingTable, walkingTableSchema } from '../src/travel/walking-table.js';

// The walking table as it stood before P04 ticket 77 counted the climb, frozen for the tests about plans, answers,
// ways and boards, so that their numbers do not move each time the walking model does, as the evaluation binds its
// frozen travel fixture. The shuttle's times are the seed's. The tests about the table itself read the committed one.
export async function readFrozenWalkingTable(): Promise<WalkingTable> {
  const file = new URL('fixtures/walking/walking-table-before-climb.json', import.meta.url);
  return walkingTableSchema.parse(JSON.parse(await readFile(file, 'utf8')));
}

export async function readFrozenTravel(): Promise<SeedTravel> {
  return readSeedTravel(SEED_DIRECTORY, await readFrozenWalkingTable());
}
