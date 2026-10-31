/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { koreaDate, koreaTime } from '../assistant/korea-time.js';
import { readSeedFile } from '../common/seed-directory.js';
import {
  bandAt,
  fallbackRideSeconds,
  fallbackWaitSeconds,
  type ShuttleBand,
  type ShuttleTiming,
  shuttleTimingSchema,
} from '../shuttle/shuttle-timing.js';
import { SHUTTLE_ADVANTAGE_SECONDS } from './judgement-constants.js';
import { WALKING_TABLE_FILE, type WalkingTable, walkingTableSchema } from './walking-table.js';

export type TravelMode = 'walk' | 'shuttle';

export interface Travel {
  seconds: number;
  mode: TravelMode;
}

// The one way to ask for a Travel Time. Both scenarios inject it by TRAVEL_PROVIDER, and the eval binds its frozen
// fixture there, so that the real table and shuttle file never reach the eval.
export interface TravelProvider {
  travel(fromPlaceId: string, toPlaceId: string, departure: Date): Travel;
}

export const TRAVEL_PROVIDER = 'TRAVEL_PROVIDER';

// How a Travel Time is shown: "4분" never turns out to be five.
export function shownMinutes(seconds: number): number {
  return Math.ceil(seconds / 60);
}

const SHUTTLE_TIMING_FILE = 'shuttle-timing.json';
const NO_TIMING: ShuttleTiming = { days: [], waits: {}, rides: {} };

const SATURDAY = 6;
const SUNDAY = 0;

// The shuttle's band at that moment in Korea, or null at a weekend or outside the service hours.
function serviceBand(at: Date): ShuttleBand | null {
  const weekday = new Date(koreaDate(at)).getUTCDay();
  if (weekday === SATURDAY || weekday === SUNDAY) {
    return null;
  }
  return bandAt(Number(koreaTime(at).slice(11, 13)));
}

// Looks the seconds up in the walking table and the shuttle's times, which are read once at start.
export class SeedTravel implements TravelProvider {
  private readonly rowOf: Map<string, number>;

  constructor(
    private readonly table: WalkingTable,
    private readonly timing: ShuttleTiming,
  ) {
    this.rowOf = new Map(table.places.map(({ id }, row) => [id, row]));
  }

  travel(fromPlaceId: string, toPlaceId: string, departure: Date): Travel {
    const from = this.row(fromPlaceId);
    const to = this.row(toPlaceId);
    const walk = this.table.placeToPlace[from]?.[to] ?? Number.POSITIVE_INFINITY;
    const shuttle = this.bestShuttleSeconds(from, to, departure);
    return shuttle + SHUTTLE_ADVANTAGE_SECONDS <= walk
      ? { seconds: Math.round(shuttle), mode: 'shuttle' }
      : { seconds: walk, mode: 'walk' };
  }

  private row(placeId: string): number {
    const row = this.rowOf.get(placeId);
    if (row === undefined) {
      throw new Error(`The walking table has no Place ${placeId}: run pnpm walking:build`);
    }
    return row;
  }

  // Over every boarding stop the User reaches in service hours and every stop ahead on the loop.
  private bestShuttleSeconds(from: number, to: number, departure: Date): number {
    const stops = this.table.stops.length;
    let best = Number.POSITIVE_INFINITY;
    for (let boarding = 0; boarding < stops; boarding += 1) {
      const walkToStop = this.table.placeToStop[from]?.[boarding] ?? Number.POSITIVE_INFINITY;
      const band = serviceBand(new Date(departure.getTime() + walkToStop * 1000));
      if (band === null) {
        continue;
      }
      const wait = this.timing.waits[boarding]?.[band] ?? fallbackWaitSeconds(band);
      for (let alighting = 0; alighting < stops; alighting += 1) {
        if (alighting !== boarding) {
          const ride = this.timing.rides[boarding]?.[alighting]?.[band] ?? fallbackRideSeconds(boarding, alighting);
          const walkFromStop = this.table.stopToPlace[alighting]?.[to] ?? Number.POSITIVE_INFINITY;
          best = Math.min(best, walkToStop + wait + ride + walkFromStop);
        }
      }
    }
    return best;
  }
}

export async function readSeedTravel(directory: string): Promise<SeedTravel> {
  const table = await readSeedFile(directory, WALKING_TABLE_FILE, walkingTableSchema);
  const timing = existsSync(join(directory, SHUTTLE_TIMING_FILE))
    ? await readSeedFile(directory, SHUTTLE_TIMING_FILE, shuttleTimingSchema)
    : NO_TIMING;
  return new SeedTravel(table, timing);
}
