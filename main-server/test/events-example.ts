/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayEvent } from '../src/assistant/events/event-fit.js';
import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { type PlaceDto } from '../src/places/dto/place.dto.js';
import { type TravelProvider } from '../src/travel/travel.js';
import { readFrozenTravel, readFrozenWalkingTable } from './frozen-travel.js';

// The design's worked example of events (section 6.3): Friday 2026-11-20, asked at 13:50, on the seed's walking table,
// where 24동 to 문화관 is 4 minutes, 문화관 to 301동 18, 301동 to 두레문예관 22, and 38동 to 문화관 11. The seed's
// shuttle is replaced by the design's: 18 minutes from 301동 to 두레문예관, 17 from 301동 to 체육관 (section 6.4, where
// the walk is 28), and none elsewhere. Call `readExample` in a beforeAll first.

export const DATE = '2026-11-20';

export const at = (clock: string): Date => onDay(DATE, clock);

export const NOW = at('13:50');

// The four Places, as the walking table and the campus map name and place them.
const PLACES: Record<string, Omit<PlaceDto, 'id'>> = {
  '24동': { name: '자연과학관6', number: '24', latitude: 37.45942, longitude: 126.94989 },
  '301동': { name: '제1공학관', number: '301', latitude: 37.45016, longitude: 126.95259 },
  문화관: { name: '문화관', number: '73', latitude: 37.46159, longitude: 126.95104 },
  두레문예관: { name: 'NH농협두레문예관', number: '67', latitude: 37.46353, longitude: 126.94973 },
  체육관: { name: '체육관', number: '71', latitude: 37.4676, longitude: 126.95238 },
  '38동': { name: '글로벌공학교육센터', number: '38', latitude: 37.4549, longitude: 126.95062 },
};

// The design's shuttle, in seconds, from one building to another.
const SHUTTLE: Record<string, number> = { '301동 두레문예관': 18 * 60, '301동 체육관': 17 * 60 };

const ids = new Map<string, string>();
let seed: TravelProvider | null = null;

export async function readExample(): Promise<void> {
  seed = await readFrozenTravel();
  const table = await readFrozenWalkingTable();
  for (const [building, { name }] of Object.entries(PLACES)) {
    const found = table.places.find((place) => place.name === name);
    if (found === undefined) {
      throw new Error(`The walking table has no ${name}`);
    }
    ids.set(building, found.id);
  }
}

// The Place id of a building of the example.
export function id(building: string): string {
  const found = ids.get(building);
  if (found === undefined) {
    throw new Error(`The example has no ${building}`);
  }
  return found;
}

export function placeOf(placeId: string): PlaceDto {
  const found = Object.entries(PLACES).find(([building]) => ids.get(building) === placeId);
  if (found === undefined) {
    throw new Error(`The example has no Place ${placeId}`);
  }
  return { id: placeId, ...found[1] };
}

const walking = (from: string, to: string): number => {
  if (seed === null) {
    throw new Error('Read the example first');
  }
  return seed.walkingSeconds(from, to);
};

function shuttleSeconds(from: string, to: string): number | undefined {
  const pair = Object.keys(SHUTTLE).find((buildings) => {
    const [start = '', end = ''] = buildings.split(' ');
    return id(start) === from && id(end) === to;
  });
  return pair === undefined ? undefined : SHUTTLE[pair];
}

export const travel: TravelProvider = {
  travel: (from, to) => {
    const shuttle = shuttleSeconds(from, to);
    return shuttle === undefined ? { seconds: walking(from, to), mode: 'walk' } : { seconds: shuttle, mode: 'shuttle' };
  },
  walkingSeconds: walking,
};

export const classAt = (start: string, end: string, building: string): DayItem => ({
  id: `${building} ${start}`,
  name: 'Class',
  start: at(start),
  end: at(end),
  placeId: id(building),
  isClass: true,
});

// Classes in 24동 until 13:50 and in 301동 from 15:30 to 16:45.
export const myDay = (): DayItem[] => [classAt('13:00', '13:50', '24동'), classAt('15:30', '16:45', '301동')];

// The day's three events: the job fair, the company session, and the concert, which has no end.
export const events = (): DayEvent[] => [
  {
    id: 'job-fair',
    title: '채용박람회',
    start: at('10:00'),
    end: at('17:00'),
    placeId: id('문화관'),
    place: '문화관',
  },
  {
    id: 'company-session',
    title: '기업 설명회',
    start: at('16:00'),
    end: at('17:00'),
    placeId: id('문화관'),
    place: '문화관',
  },
  {
    id: 'concert',
    title: '동아리 정기공연',
    start: at('18:00'),
    end: null,
    placeId: id('두레문예관'),
    place: '두레문예관',
  },
];
