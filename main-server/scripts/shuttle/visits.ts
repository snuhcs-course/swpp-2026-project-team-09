/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { alongLoopMetres, fallbackRideSeconds, SHUTTLE_STOP_COUNT } from '../../src/shuttle/shuttle-timing.ts';
import { clockTime, MINUTE, SECOND } from './clock.ts';
import { appendTo, type ReportLine, type ShuttleSet } from './sets.ts';

// Rules R3 to R7 of the shuttle log (the P04 spec): the sets of a day as each car's visits to the stops and its moves
// between them.

// Rounded up from 5,226 m at 11 m/s, the top speed.
export const FASTEST_LAP = 8 * MINUTE;
const NEAR = MINUTE;
const FLICKER_SETS = 2;
const STEP_GAP = 35 * SECOND;
const SHORT_GAP = 120 * SECOND;
const TOP_SPEED = 11;
const SHORTEST_GAP_SECONDS = 15;

const SHINSOJAE = 5;
const LAYOVER_SLACK_SECONDS = 180;
const OTHER_SLACK_SECONDS = 600;

export const ALL_STOPS: readonly number[] = Array.from({ length: SHUTTLE_STOP_COUNT }, (_, stop) => stop);

// D_s: the baseline drive from each stop to the next, in seconds.
export const BASELINE_DRIVE_SECONDS = ALL_STOPS.map((stop) =>
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

export function describeSighting(car: string, stop: number, at: number): string {
  return `${car} at stop ${stop}, ${clockTime(at)}`;
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
      report.push({ rule: 'R3', reason: 'isolated sighting', detail: describeSighting(car, stop, at) });
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
  return backOrNext && short && first(after.times) - last(before.times) < FASTEST_LAP;
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
      detail: `${describeSighting(car, run.stop, first(run.times))}, ${run.times.length} sets`,
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

function newVisit(car: string, stop: number, times: number[]): Visit {
  return { car, stop, times, entry: null, exit: null, next: null, ahead: 0 };
}

// R5.
function toVisits(car: string, runs: Run[]): Visit[] {
  const visits: Visit[] = [];
  for (const { stop, times } of runs) {
    let current: number[] = [];
    for (const at of times) {
      if (current.length > 0 && at - last(current) >= FASTEST_LAP) {
        visits.push(newVisit(car, stop, current));
        current = [];
      }
      current.push(at);
    }
    visits.push(newVisit(car, stop, current));
  }
  return visits;
}

function stopsAhead(from: Visit, to: Visit): number {
  return (to.stop - from.stop + SHUTTLE_STOP_COUNT) % SHUTTLE_STOP_COUNT;
}

// R6.
function classify(from: Visit, to: Visit): Move {
  const gap = arrival(to) - lastSet(from);
  const reach = TOP_SPEED * Math.max(gap / SECOND, SHORTEST_GAP_SECONDS);
  if (gap >= FASTEST_LAP) {
    return 'ABSENT';
  }
  if (alongLoopMetres((from.stop + 1) % SHUTTLE_STOP_COUNT, to.stop) > reach) {
    return 'JUMP';
  }
  if (gap <= STEP_GAP) {
    return stopsAhead(from, to) === 1 ? 'STEP' : 'SKIP';
  }
  return gap <= SHORT_GAP && stopsAhead(from, to) <= 2 ? 'GAP' : 'BREAK';
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
      from.ahead = stopsAhead(from, to);
      to.entry = move;
    }
  }
  return visits;
}

export function sightingsByCar(sets: ShuttleSet[]): Map<string, Sighting[]> {
  const cars = new Map<string, Sighting[]>();
  for (const { at, cars: stops } of sets) {
    for (const [car, stop] of stops) {
      appendTo(cars, car, { at, stop });
    }
  }
  return cars;
}
