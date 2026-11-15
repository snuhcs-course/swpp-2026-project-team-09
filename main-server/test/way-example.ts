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
import { type ShuttleStopDto } from '../src/shuttle/dto/shuttle-route.dto.js';
import { readSeedStops } from '../src/shuttle/shuttle.seed.js';
import { readSeedTravel, type SeedTravel } from '../src/travel/travel.js';

// The campus of the boards of a way (q1, q2, q3, q4, and q15): the seed's Places, walking table, shuttle timing, and
// shuttle stops. Call `readCampus` in a beforeAll first.

export const ME = 'b0c2e3a4-0000-4000-8000-000000000001';

// A Tuesday and a Wednesday.
export const TUESDAY = '2026-11-17';
export const WEDNESDAY = '2026-11-18';

let travel: SeedTravel | null = null;
let places: PlaceDto[] = [];
let stops: ShuttleStopDto[] = [];

export async function readCampus(): Promise<void> {
  travel = await readSeedTravel(SEED_DIRECTORY);
  const seed = await readSeedPlaces(SEED_DIRECTORY, await readCampusBoundary(SEED_DIRECTORY));
  places = seed.map(({ id, number, name, latitude, longitude }) => ({ id, number, name, latitude, longitude }));
  // The database gives a stop its id; its key in the seed stands in for it.
  stops = (await readSeedStops(SEED_DIRECTORY)).map(({ seedKey, name, latitude, longitude }) => ({
    id: `stop ${seedKey}`,
    name,
    latitude,
    longitude,
  }));
}

// The seed's walking table and shuttle timing.
export function seedTravel(): SeedTravel {
  if (travel === null) {
    throw new Error('Read the campus first');
  }
  return travel;
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

// The Place of that number.
export function numbered(number: string): PlaceDto {
  const found = places.find((each) => each.number === number);
  if (found === undefined) {
    throw new Error(`The seed has no Place numbered ${number}`);
  }
  return found;
}

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

// The shuttle stop of that name.
export function stop(name: string): ShuttleStopDto {
  const found = stops.find((each) => each.name === name);
  if (found === undefined) {
    throw new Error(`The seed has no shuttle stop named ${name}`);
  }
  return found;
}

export const stopPosition = (name: string): Position => {
  const { latitude, longitude } = stop(name);
  return { latitude, longitude };
};

// The seed's shuttle route, with these shuttles reported, each at the stop it passed last.
export const reporting = (reported: { stop: string; at: Date }[]): WayArgs['shuttle'] => ({ stops, reported });

export const stopPoint = (name: string): PlacePoint => ({
  placeId: stop(name).id,
  label: `${name} 정류장`,
  ...stopPosition(name),
});

export const time = (date: string, clock: string): string => `${date}T${clock}:00+09:00`;

export const classAt = (date: string, start: string, end: string, placeName: string): DayItem => ({
  id: `${placeName} ${start}`,
  name: 'Class',
  start: onDay(date, start),
  end: onDay(date, end),
  placeId: id(placeName),
  isClass: true,
});

// The asker's way at `now`, with nothing known unless given: no shuttle is reported, and the travel times are the
// seed's.
export function wayFor(now: Date, given: Partial<Omit<WayArgs, 'now' | 'placeOf'>>): WayAnswer {
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
    shuttle: { stops, reported: [] },
    placeOf,
    ...given,
  });
}
