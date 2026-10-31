/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
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
