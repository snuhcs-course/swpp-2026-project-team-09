/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import {
  SHUTTLE_BANDS,
  SHUTTLE_STOP_COUNT,
  type ShuttleBand,
  type ShuttleTiming,
} from '../../src/shuttle/shuttle-timing.ts';
import { bandOf, SECOND } from './clock.ts';
import { type CleanedDay } from './departures.ts';
import { type ReportLine } from './sets.ts';
import { ALL_STOPS, arrival, baselineDriveMs, type Visit } from './visits.ts';

// Rules R11 and R12 of the shuttle log (the P04 spec), and the times `shuttle-timing.json` holds.

const KEPT_SHARE = 0.75;
const HOUR = 60 * 60 * SECOND;

export interface WaitCell {
  stop: number;
  band: ShuttleBand;
  waitSeconds: number;
  keptSeconds: number;
  droppedSeconds: number;
  // R11: at least 75% of the headway time was kept, so that the score counts it.
  enoughKept: boolean;
}

export interface Ride {
  from: number;
  to: number;
  band: ShuttleBand;
  seconds: number;
}

function bandEdges(date: string, band: ShuttleBand): [number, number] {
  const midnight = Date.parse(`${date}T00:00:00+09:00`);
  return [midnight + Number(band.slice(0, 2)) * HOUR, midnight + Number(band.slice(3)) * HOUR];
}

interface HeadwayPart {
  seconds: number;
  waited: number;
  dropped: boolean;
}

// A band's parts of a stop's headways, on the band clock (R8). A rider arrives anywhere in a headway and waits for its
// end, so `waited` is the integral of that wait over the part. For a whole headway h that is h²/2.
function headwayParts(days: CleanedDay[], stop: number, band: ShuttleBand): HeadwayPart[] {
  return days.flatMap(({ date, headways }) => {
    const [bandStart, bandEnd] = bandEdges(date, band);
    return headways
      .filter((headway) => headway.stop === stop)
      .flatMap(({ start, end, droppedFor }) => {
        const finish = end - baselineDriveMs(stop);
        const from = Math.max(start - baselineDriveMs(stop), bandStart);
        const to = Math.min(finish, bandEnd);
        if (to <= from) {
          return [];
        }
        const waited = (((finish - from) / SECOND) ** 2 - ((finish - to) / SECOND) ** 2) / 2;
        return [{ seconds: (to - from) / SECOND, waited, dropped: droppedFor !== null }];
      });
  });
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

// R11, over the headways of the days given: the kept parts' waiting over their time, which is Σh² / (2Σh).
export function waitCells(days: CleanedDay[]): WaitCell[] {
  return ALL_STOPS.flatMap((stop) =>
    SHUTTLE_BANDS.flatMap((band) => {
      const parts = headwayParts(days, stop, band);
      const kept = parts.filter(({ dropped }) => !dropped);
      const keptSeconds = sum(kept.map(({ seconds }) => seconds));
      const droppedSeconds = sum(parts.map(({ seconds }) => seconds)) - keptSeconds;
      if (parts.length === 0) {
        return [];
      }
      return [
        {
          stop,
          band,
          waitSeconds: keptSeconds > 0 ? sum(kept.map(({ waited }) => waited)) / keptSeconds : 0,
          keptSeconds,
          droppedSeconds,
          enoughKept: keptSeconds > 0 && keptSeconds >= KEPT_SHARE * (keptSeconds + droppedSeconds),
        },
      ];
    }),
  );
}

export function waitReport(cells: WaitCell[]): ReportLine[] {
  return cells
    .filter(({ enoughKept }) => !enoughKept)
    .map(({ stop, band, keptSeconds, droppedSeconds }) => ({
      rule: 'R11',
      reason: 'under 75% of the headway time kept',
      detail: `stop ${stop}, ${band}: kept ${Math.round(keptSeconds)} s, dropped ${Math.round(droppedSeconds)} s`,
    }));
}

// The runs of consecutive segments of one car, each with the visit it ends at.
function consecutiveVisits(segments: Visit[]): Visit[][] {
  const runs: Visit[][] = [];
  for (const visit of segments) {
    const run = runs.at(-1);
    if (run?.at(-1) === visit) {
      run.push(visit.next ?? visit);
    } else {
      runs.push([visit, visit.next ?? visit]);
    }
  }
  return runs;
}

// R12: every pair of visits along a run, less than a lap apart, banded by the arrival at the first.
export function ridesOf({ segments }: CleanedDay): Ride[] {
  const rides: Ride[] = [];
  for (const run of consecutiveVisits(segments)) {
    for (const [index, start] of run.entries()) {
      const band = bandOf(arrival(start));
      let ahead = start.ahead;
      for (const end of run.slice(index + 1)) {
        if (band === null || ahead >= SHUTTLE_STOP_COUNT) {
          break;
        }
        rides.push({ from: start.stop, to: end.stop, band, seconds: (arrival(end) - arrival(start)) / SECOND });
        ahead += end.ahead;
      }
    }
  }
  return rides;
}

function median(values: number[]): number {
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return ((sorted[middle] ?? 0) + (sorted[sorted.length - 1 - middle] ?? 0)) / 2;
}

function medianRides(rides: Ride[]): ShuttleTiming['rides'] {
  const pairs = new Map<string, { from: number; to: number; band: ShuttleBand; samples: number[] }>();
  for (const { from, to, band, seconds } of rides) {
    const key = `${from} ${to} ${band}`;
    const pair = pairs.get(key) ?? { from, to, band, samples: [] };
    pair.samples.push(seconds);
    pairs.set(key, pair);
  }
  const timing: ShuttleTiming['rides'] = {};
  for (const { from, to, band, samples } of pairs.values()) {
    (timing[from] ??= {})[to] = { ...timing[from]?.[to], [band]: Math.round(median(samples)) };
  }
  return timing;
}

// What `shuttle-timing.json` holds for these days. R11's 75% decides what is scored: the file takes any kept time.
export function deriveTiming(days: CleanedDay[]): ShuttleTiming {
  const waits: ShuttleTiming['waits'] = {};
  for (const { stop, band, waitSeconds, keptSeconds } of waitCells(days)) {
    if (keptSeconds > 0) {
      waits[stop] = { ...waits[stop], [band]: Math.round(waitSeconds) };
    }
  }
  return { days: days.map(({ date }) => date), waits, rides: medianRides(days.flatMap((day) => ridesOf(day))) };
}
