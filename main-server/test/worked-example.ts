/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayItem, freeTimeOf, onDay } from '../src/assistant/free-time/free-time.js';
import { mealWindow } from '../src/assistant/free-time/meal-fit.js';
import {
  type Gathering,
  gather,
  type GatheringPerson,
  type GatheringPlace,
} from '../src/assistant/gathering/gathering.js';
import { readSeedFile, SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { type PlaceDto } from '../src/places/dto/place.dto.js';
import { readSeedTravel, type SeedTravel } from '../src/travel/travel.js';
import { WALKING_TABLE_FILE, walkingTableSchema } from '../src/travel/walking-table.js';

// The design's worked example: lunch on Tuesday 2026-11-17, asked at 11:50, on the seed's walking table. Call
// `readWorld` in a beforeAll first.

export const DATE = '2026-11-17';

export const at = (clock: string): Date => onDay(DATE, clock);

export const NOW = at('11:50');

// The seven Places of the example, with their numbers and positions as the campus map gives them.
const PLACES = [
  { name: '제1공학관', number: '301', latitude: 37.45016, longitude: 126.95259 },
  { name: '제2공학관', number: '302', latitude: 37.44887, longitude: 126.95265 },
  { name: '학생회관', number: '63', latitude: 37.45932, longitude: 126.95058 },
  { name: '제3학생식당', number: '75-1', latitude: 37.45647, longitude: 126.94851 },
  { name: '자하연식당', number: '109', latitude: 37.46098, longitude: 126.95252 },
  { name: '자연과학관6', number: '24', latitude: 37.45942, longitude: 126.94989 },
  { name: '두산인문관', number: '8', latitude: 37.46016, longitude: 126.95398 },
];

let travel: SeedTravel | null = null;
const idOf = new Map<string, string>();
const places = new Map<string, PlaceDto>();

export async function readWorld(): Promise<void> {
  travel = await readSeedTravel(SEED_DIRECTORY);
  const table = await readSeedFile(SEED_DIRECTORY, WALKING_TABLE_FILE, walkingTableSchema);
  for (const place of table.places) {
    idOf.set(place.name, place.id);
  }
  for (const place of PLACES) {
    places.set(id(place.name), { id: id(place.name), ...place });
  }
}

export function id(name: string): string {
  const found = idOf.get(name);
  if (found === undefined) {
    throw new Error(`The walking table has no ${name}`);
  }
  return found;
}

export function placeOf(placeId: string): PlaceDto {
  const found = places.get(placeId);
  if (found === undefined) {
    throw new Error(`The example has no Place ${placeId}`);
  }
  return found;
}

export const classAt = (start: string, end: string, placeName: string): DayItem => ({
  id: `${placeName} ${start}`,
  name: 'Class',
  start: at(start),
  end: at(end),
  placeId: id(placeName),
  isClass: true,
});

// Each person's items of the day.
export const myDay = (): DayItem[] => [
  classAt('11:00', '11:50', '제1공학관'),
  classAt('13:00', '13:50', '자연과학관6'),
];

export const minsuDay = (): DayItem[] => [classAt('11:00', '12:15', '제2공학관')];

export const jieunDay = (): DayItem[] => [
  classAt('11:00', '12:15', '두산인문관'),
  classAt('13:00', '14:15', '두산인문관'),
];

export const gatheringPerson = (
  personId: string,
  items: readonly DayItem[],
  locationPlaceId: string | null = null,
  now = NOW,
): GatheringPerson => ({ id: personId, free: freeTimeOf(items, DATE, now), locationPlaceId });

export const restaurants = (): GatheringPlace[] => [
  { key: '301동식당', placeId: id('제1공학관') },
  { key: '302동식당', placeId: id('제2공학관') },
  { key: '학생회관식당', placeId: id('학생회관') },
  { key: '3식당', placeId: id('제3학생식당') },
  { key: '자하연식당', placeId: id('자하연식당') },
];

export function plan(
  people: [GatheringPerson, ...GatheringPerson[]],
  candidates = restaurants(),
  now = NOW,
): Gathering {
  if (travel === null) {
    throw new Error('Read the world first');
  }
  return gather(people, candidates, { window: mealWindow(DATE, 'lunch'), now }, travel);
}
