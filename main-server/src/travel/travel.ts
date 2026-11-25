/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
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

// The legs of the shuttle way `travel` weighs against walking, in seconds. A stop is known by its place on the loop
// (`loop_order`) and its name.
export interface ShuttleWay {
  // The stops ridden, from the boarding stop to the alighting stop, each with the ride to it from the boarding stop.
  stops: { order: number; name: string; rideSeconds: number }[];
  walkToStopSeconds: number;
  // The timing's average wait at the boarding stop.
  waitSeconds: number;
  walkFromStopSeconds: number;
  // The ride to the boarding stop from each stop of the loop, in loop order, 0 from the boarding stop itself.
  ridesToBoarding: number[];
  // One lap of the loop from the boarding stop back to it.
  lapSeconds: number;
}

// The one way to ask for a Travel Time. Injected by TRAVEL_PROVIDER, so that a fixture can stand in for the real table
// and shuttle file.
export interface TravelProvider {
  travel(fromPlaceId: string, toPlaceId: string, departure: Date): Travel;
  // The way on foot alone, whatever the shuttle offers. A leave-by time's out-travel departs by it.
  walkingSeconds(fromPlaceId: string, toPlaceId: string): number;
  // The shuttle way `travel` weighs, or null when the shuttle does not run then. A fixture that knows no shuttle, such
  // as the evaluation's frozen one, leaves it out.
  shuttleWay?(fromPlaceId: string, toPlaceId: string, departure: Date): ShuttleWay | null;
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

// The cell of a table's rows, which a Place's row and a stop's loop order always find.
function cell(rows: readonly (readonly number[])[], row: number, column: number): number {
  return rows[row]?.[column] ?? Number.POSITIVE_INFINITY;
}

interface Best {
  boarding: number;
  alighting: number;
  band: ShuttleBand;
  walkToStop: number;
  wait: number;
  walkFromStop: number;
  seconds: number;
}

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
    const walk = cell(this.table.placeToPlace, from, to);
    const shuttle = this.bestShuttle(from, to, departure)?.seconds ?? Number.POSITIVE_INFINITY;
    return shuttle + SHUTTLE_ADVANTAGE_SECONDS <= walk
      ? { seconds: Math.round(shuttle), mode: 'shuttle' }
      : { seconds: walk, mode: 'walk' };
  }

  walkingSeconds(fromPlaceId: string, toPlaceId: string): number {
    return cell(this.table.placeToPlace, this.row(fromPlaceId), this.row(toPlaceId));
  }

  shuttleWay(fromPlaceId: string, toPlaceId: string, departure: Date): ShuttleWay | null {
    const best = this.bestShuttle(this.row(fromPlaceId), this.row(toPlaceId), departure);
    if (best === null) {
      return null;
    }
    const { boarding, alighting, band, walkToStop, wait, walkFromStop } = best;
    const { stops } = this.table;
    const ridden = (alighting - boarding + stops.length) % stops.length;
    const before = (boarding - 1 + stops.length) % stops.length;
    return {
      stops: Array.from({ length: ridden + 1 }, (_, step) => {
        const order = (boarding + step) % stops.length;
        return { order, name: stops[order]?.name ?? '', rideSeconds: this.ride(boarding, order, band) };
      }),
      walkToStopSeconds: walkToStop,
      waitSeconds: wait,
      walkFromStopSeconds: walkFromStop,
      ridesToBoarding: stops.map((_, order) => this.ride(order, boarding, band)),
      lapSeconds: this.ride(boarding, before, band) + this.ride(before, boarding, band),
    };
  }

  private row(placeId: string): number {
    const row = this.rowOf.get(placeId);
    if (row === undefined) {
      throw new Error(`The walking table has no Place ${placeId}: run pnpm walking:build`);
    }
    return row;
  }

  // From a stop to another along the loop, 0 from a stop to itself.
  private ride(from: number, to: number, band: ShuttleBand): number {
    return this.timing.rides[from]?.[to]?.[band] ?? fallbackRideSeconds(from, to);
  }

  // Over every boarding stop the User reaches in service hours and every stop ahead on the loop.
  private bestShuttle(from: number, to: number, departure: Date): Best | null {
    const stops = this.table.stops.length;
    let best: Best | null = null;
    for (let boarding = 0; boarding < stops; boarding += 1) {
      const walkToStop = cell(this.table.placeToStop, from, boarding);
      const band = serviceBand(new Date(departure.getTime() + walkToStop * 1000));
      if (band === null) {
        continue;
      }
      const wait = this.timing.waits[boarding]?.[band] ?? fallbackWaitSeconds(band);
      for (let alighting = 0; alighting < stops; alighting += 1) {
        if (alighting !== boarding) {
          const walkFromStop = cell(this.table.stopToPlace, alighting, to);
          const seconds = walkToStop + wait + this.ride(boarding, alighting, band) + walkFromStop;
          if (best === null || seconds < best.seconds) {
            best = { boarding, alighting, band, walkToStop, wait, walkFromStop, seconds };
          }
        }
      }
    }
    return best;
  }
}

// `walkingTable`, when given, answers in the place of the directory's: the tests about plans and ways bind a frozen
// one, so that their numbers stay when the walking model changes (P04 ticket 77).
export async function readSeedTravel(directory: string, walkingTable?: WalkingTable): Promise<SeedTravel> {
  const table = walkingTable ?? (await readSeedFile(directory, WALKING_TABLE_FILE, walkingTableSchema));
  const timing = existsSync(join(directory, SHUTTLE_TIMING_FILE))
    ? await readSeedFile(directory, SHUTTLE_TIMING_FILE, shuttleTimingSchema)
    : NO_TIMING;
  return new SeedTravel(table, timing);
}
