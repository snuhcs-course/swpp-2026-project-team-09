/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type PlacePoint } from '../src/assistant/dto/answer.dto.js';
import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { wayAnswer, type WayAnswer, type WayArgs } from '../src/assistant/lookup/way-lookup.js';
import { readCampusBoundary } from '../src/common/campus-boundary.js';
import { type Position } from '../src/common/geometry.js';
import { SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { type PlaceDto } from '../src/places/dto/place.dto.js';
import { readSeedPlaces } from '../src/places/places.seed.js';
import { readSeedTravel, type SeedTravel } from '../src/travel/travel.js';

// The campus of the boards of a way (q1, q2, q3, and q15): the seed's Places and walking table. Call `readCampus` in a
// beforeAll first.

export const ME = 'b0c2e3a4-0000-4000-8000-000000000001';

// A Tuesday and a Wednesday.
export const TUESDAY = '2026-11-17';
export const WEDNESDAY = '2026-11-18';

let travel: SeedTravel | null = null;
let places: PlaceDto[] = [];

export async function readCampus(): Promise<void> {
  travel = await readSeedTravel(SEED_DIRECTORY);
  const seed = await readSeedPlaces(SEED_DIRECTORY, await readCampusBoundary(SEED_DIRECTORY));
  places = seed.map(({ id, number, name, latitude, longitude }) => ({ id, number, name, latitude, longitude }));
}

// The Place of that name.
export function place(name: string): PlaceDto {
  const found = places.find((each) => each.name === name);
  if (found === undefined) {
    throw new Error(`The seed has no Place named ${name}`);
  }
  return found;
}

export const id = (name: string): string => place(name).id;

export function placeOf(placeId: string): PlaceDto {
  const found = places.find((each) => each.id === placeId);
  if (found === undefined) {
    throw new Error(`The seed has no Place ${placeId}`);
  }
  return found;
}

export const position = (name: string): Position => {
  const { latitude, longitude } = place(name);
  return { latitude, longitude };
};

export const point = (name: string, label: string): PlacePoint => ({ placeId: id(name), label, ...position(name) });

export const time = (date: string, clock: string): string => `${date}T${clock}:00+09:00`;

export const classAt = (date: string, start: string, end: string, placeName: string): DayItem => ({
  id: `${placeName} ${start}`,
  name: 'Class',
  start: onDay(date, start),
  end: onDay(date, end),
  placeId: id(placeName),
  isClass: true,
});

// The asker's way at `now`, with nothing known unless given.
export function wayFor(now: Date, given: Partial<Omit<WayArgs, 'now' | 'travel' | 'placeOf'>>): WayAnswer {
  if (travel === null) {
    throw new Error('Read the campus first');
  }
  return wayAnswer({
    now,
    me: { userId: ME, name: '유상', items: [] },
    location: null,
    fromPlaceId: null,
    toPlaceId: null,
    by: null,
    gatePlaceId: id('서울대 정문'),
    travel,
    placeOf,
    ...given,
  });
}
