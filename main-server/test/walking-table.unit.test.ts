/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { readCampusBoundary } from '../src/common/campus-boundary.js';
import { readSeedFile, SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { readSeedPlaces } from '../src/places/places.seed.js';
import { readSeedStops } from '../src/shuttle/shuttle.seed.js';
import { WALKING_TABLE_FILE, walkingTableSchema } from '../src/travel/walking-table.js';

describe('the committed walking table', () => {
  it('covers every seeded Place and Shuttle Stop, in every direction', async () => {
    const table = await readSeedFile(SEED_DIRECTORY, WALKING_TABLE_FILE, walkingTableSchema);
    const places = await readSeedPlaces(SEED_DIRECTORY, await readCampusBoundary(SEED_DIRECTORY));
    const stops = await readSeedStops(SEED_DIRECTORY);

    expect(table.places.map(({ id }) => id).toSorted()).toEqual(places.map(({ id }) => id).toSorted());
    expect(table.stops.map(({ name }) => name)).toEqual(stops.map(({ name }) => name));
    expect(table.placeToPlace.map((row) => row.length)).toEqual(places.map(() => places.length));
    expect(table.placeToStop.map((row) => row.length)).toEqual(places.map(() => stops.length));
    expect(table.stopToPlace.map((row) => row.length)).toEqual(stops.map(() => places.length));
  });
});

// The committed table's seconds between two Places by their numbers, in that direction.
async function secondsBetween(fromNumber: string, toNumber: string): Promise<number> {
  const table = await readSeedFile(SEED_DIRECTORY, WALKING_TABLE_FILE, walkingTableSchema);
  const places = await readSeedPlaces(SEED_DIRECTORY, await readCampusBoundary(SEED_DIRECTORY));
  const row = (number: string): number => {
    const id = places.find((place) => place.number === number)?.id;
    return table.places.findIndex((place) => place.id === id);
  };
  return table.placeToPlace[row(fromNumber)]?.[row(toNumber)] ?? Number.NaN;
}

// P04 ticket 77: the table counts the climb, so a way up and the way down differ (the user's phone on 2026-11-26 showed
// (관악사)학부 생활관 (919) to 제2공학관 (302), 114 m up, as long as the way down). Partitions: a steep pair; a flat
// pair. Expected values: at least a minute between up and down; the flat pair's 258 s of the table before, within 3 s.
describe('the committed walking table, up and down', () => {
  it('takes at least a minute longer up from 919 to 302 than down from 302 to 919', async () => {
    const up = await secondsBetween('919', '302');
    const down = await secondsBetween('302', '919');

    expect(up - down).toBeGreaterThanOrEqual(60);
  });

  it('keeps a flat pair as it was, both ways', async () => {
    const there = await secondsBetween('58', '83');
    const back = await secondsBetween('83', '58');

    expect(Math.abs(there - 258)).toBeLessThanOrEqual(3);
    expect(Math.abs(back - 258)).toBeLessThanOrEqual(3);
  });
});
