/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { alongLoopMetres, fallbackRideSeconds, SHUTTLE_STOP_COUNT } from '../../src/shuttle/shuttle-timing.ts';
import { clockTime, type ReportLine, type ShuttleSet } from './sets.ts';

// Rules R3 to R7 of the shuttle log (the P04 spec): the sets of a day as each car's visits to the stops and its moves
// between them.

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;

// The fastest lap there can be: 5,226 m at 11 m/s is 7.9 minutes.
export const LAP = 8 * MINUTE;
const NEAR = MINUTE;
const FLICKER_SETS = 2;
const STEP_GAP = 35 * SECOND;
const SHORT_GAP = 120 * SECOND;
const TOP_SPEED = 11;
const SHORTEST_GAP_SECONDS = 15;

const SHINSOJAE = 5;
const LAYOVER_SLACK_SECONDS = 180;
const OTHER_SLACK_SECONDS = 600;

// D_s: the baseline drive from each stop to the next, in seconds.
export const BASELINE_DRIVE_SECONDS: readonly number[] = Array.from({ length: SHUTTLE_STOP_COUNT }, (_, stop) =>
  Math.round(fallbackRideSeconds(stop, (stop + 1) % SHUTTLE_STOP_COUNT)),
);

export function baselineDriveMs(stop: number): number {
  return (BASELINE_DRIVE_SECONDS[stop] ?? 0) * SECOND;
}

export function longLimitSeconds(stop: number): number {
  return (BASELINE_DRIVE_SECONDS[stop] ?? 0) + (stop === SHINSOJAE ? LAYOVER_SLACK_SECONDS : OTHER_SLACK_SECONDS);
}

export type Move = 'ABSENT' | 'JUMP' | 'STEP' | 'SKIP' | 'GAP' | 'BREAK';

export interface Visit {
  car: string;
  stop: number;
  // The sets it was seen in. The first is the arrival.
  times: number[];
  entry: Move | null;
  exit: Move | null;
  next: Visit | null;
  // How many stops ahead the next visit is.
  ahead: number;
}

interface Sighting {
  at: number;
  stop: number;
}

interface Run {
  stop: number;
  times: number[];
}

function first(times: number[]): number {
  return times[0] ?? Number.NaN;
}

function last(times: number[]): number {
  return times.at(-1) ?? Number.NaN;
}

export function arrival({ times }: Visit): number {
  return first(times);
}

export function lastSet({ times }: Visit): number {
  return last(times);
}

// R7.
export function isLong(visit: Visit): boolean {
  return visit.next !== null && arrival(visit.next) - arrival(visit) > longLimitSeconds(visit.stop) * SECOND;
}

// R3.
function withoutIsolated(car: string, sightings: Sighting[], report: ReportLine[]): Sighting[] {
  return sightings.filter(({ at, stop }, index) => {
    const neighbours = [sightings[index - 1], sightings[index + 1]];
    const near = neighbours.some((other) => other !== undefined && Math.abs(other.at - at) <= NEAR);
    if (!near) {
      report.push({ rule: 'R3', reason: 'isolated sighting', detail: `${car} at stop ${stop}, ${clockTime(at)}` });
    }
    return near;
  });
}

function toRuns(sightings: Sighting[]): Run[] {
  const runs: Run[] = [];
  for (const { at, stop } of sightings) {
    const run = runs.at(-1);
    if (run?.stop === stop) {
      run.times.push(at);
    } else {
      runs.push({ stop, times: [at] });
    }
  }
  return runs;
}

function isFlicker(before: Run, run: Run, after: Run): boolean {
  const backOrNext = after.stop === before.stop || after.stop === (before.stop + 1) % SHUTTLE_STOP_COUNT;
  const short = run.times.length <= FLICKER_SETS || run.times.length < after.times.length;
  return backOrNext && short && first(after.times) - last(before.times) < LAP;
}

// R4. The scan steps back after a deletion, since the runs around it are new neighbours.
function withoutFlicker(car: string, runs: Run[], report: ReportLine[]): Run[] {
  const kept = [...runs];
  let index = 1;
  while (index < kept.length - 1) {
    const [before, run, after] = kept.slice(index - 1, index + 2);
    if (before === undefined || run === undefined || after === undefined || !isFlicker(before, run, after)) {
      index += 1;
      continue;
    }
    report.push({
      rule: 'R4',
      reason: 'flicker',
      detail: `${car} at stop ${run.stop}, ${clockTime(first(run.times))}, ${run.times.length} sets`,
    });
    if (after.stop === before.stop) {
      before.times.push(...after.times);
      kept.splice(index, 2);
    } else {
      kept.splice(index, 1);
    }
    index = Math.max(1, index - 1);
  }
  return kept;
}

// R5.
function toVisits(car: string, runs: Run[]): Visit[] {
  const visits: Visit[] = [];
  for (const { stop, times } of runs) {
    let current: number[] = [];
    for (const at of times) {
      if (current.length > 0 && at - last(current) >= LAP) {
        visits.push({ car, stop, times: current, entry: null, exit: null, next: null, ahead: 0 });
        current = [];
      }
      current.push(at);
    }
    visits.push({ car, stop, times: current, entry: null, exit: null, next: null, ahead: 0 });
  }
  return visits;
}

// R6.
function classify(from: Visit, to: Visit): Move {
  const gap = arrival(to) - lastSet(from);
  const ahead = (to.stop - from.stop + SHUTTLE_STOP_COUNT) % SHUTTLE_STOP_COUNT;
  const reach = TOP_SPEED * Math.max(gap / SECOND, SHORTEST_GAP_SECONDS);
  if (gap >= LAP) {
    return 'ABSENT';
  }
  if (alongLoopMetres((from.stop + 1) % SHUTTLE_STOP_COUNT, to.stop) > reach) {
    return 'JUMP';
  }
  if (gap <= STEP_GAP) {
    return ahead === 1 ? 'STEP' : 'SKIP';
  }
  return gap <= SHORT_GAP && ahead <= 2 ? 'GAP' : 'BREAK';
}

export function visitsOf(car: string, sightings: Sighting[], report: ReportLine[]): Visit[] {
  const runs = withoutFlicker(car, toRuns(withoutIsolated(car, sightings, report)), report);
  const visits = toVisits(car, runs);
  for (const [index, to] of visits.slice(1).entries()) {
    const from = visits[index];
    if (from !== undefined) {
      const move = classify(from, to);
      from.exit = move;
      from.next = to;
      from.ahead = (to.stop - from.stop + SHUTTLE_STOP_COUNT) % SHUTTLE_STOP_COUNT;
      to.entry = move;
    }
  }
  return visits;
}

// Each car's sightings in time order, under its id.
export function sightingsByCar(sets: ShuttleSet[]): Map<string, Sighting[]> {
  const cars = new Map<string, Sighting[]>();
  for (const { at, cars: stops } of sets) {
    for (const [car, stop] of stops) {
      const sightings = cars.get(car) ?? [];
      sightings.push({ at, stop });
      cars.set(car, sightings);
    }
  }
  return cars;
}
