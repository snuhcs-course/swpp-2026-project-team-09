/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { SHUTTLE_STOP_COUNT } from '../../src/shuttle/shuttle-timing.ts';
import { bandOf, clockTime, MINUTE } from './clock.ts';
import { type ReportLine, type ShuttleDay } from './sets.ts';
import {
  ALL_STOPS,
  arrival,
  describeSighting,
  FASTEST_LAP,
  isLong,
  lastSet,
  type Move,
  sightingsByCar,
  type Visit,
  visitsOf,
} from './visits.ts';

// Rules R8 to R10 of the shuttle log (the P04 spec): a car's departures from the stops, where one may have gone unseen,
// and the headways that are left.

const STOOD_PARKED = 10 * MINUTE;
const BACKWARD_FROM = 12;

// 정문, 38동 and 신소재공동연구소.
const PARKING_STOPS = new Set([0, 4, 5]);

// A car leaving a stop. Its time is the car's first set at the next stop.
export interface Departure {
  stop: number;
  car: string;
  at: number;
}

// Stops and times where a departure may have gone unseen.
export interface UnknownWindow {
  stops: readonly number[];
  from: number;
  to: number;
  reason: string;
  car: string;
}

export interface Headway {
  stop: number;
  start: number;
  end: number;
  droppedFor: string | null;
}

export interface CleanedDay {
  date: string;
  visits: Map<string, Visit[]>;
  departures: Departure[];
  windows: UnknownWindow[];
  headways: Headway[];
  // The visits of R12's segments, in each car's order: each is timed from its arrival to the next one's.
  segments: Visit[];
  report: ReportLine[];
}

function isMoving(move: Move | null): boolean {
  return move === 'STEP' || move === 'SKIP' || move === 'GAP';
}

function isTimed(move: Move | null): boolean {
  return move === 'STEP' || move === 'SKIP';
}

function isBackward(visit: Visit): boolean {
  return visit.exit === 'JUMP' && visit.ahead >= BACKWARD_FROM;
}

// R8.
function confirms(next: Visit, from: Visit): boolean {
  return isMoving(next.exit) || (!isLong(from) && next.times.length >= 2 && !isBackward(next));
}

function stopsPassed({ stop, ahead }: Visit): number[] {
  return Array.from({ length: ahead }, (_, step) => (stop + step) % SHUTTLE_STOP_COUNT);
}

function described(visit: Visit): string {
  return describeSighting(visit.car, visit.stop, arrival(visit));
}

class DayCleaning {
  readonly departures: Departure[] = [];
  readonly windows: UnknownWindow[] = [];
  readonly segments: Visit[] = [];
  readonly report: ReportLine[] = [];
  private readonly dayStart: number;
  private readonly dayEnd: number;

  constructor(dayStart: number, dayEnd: number) {
    this.dayStart = dayStart;
    this.dayEnd = dayEnd;
  }

  private mark(window: UnknownWindow): void {
    const { stops, from, to, reason, car } = window;
    this.windows.push(window);
    this.report.push({
      rule: 'R9',
      reason: `window: ${reason}`,
      detail: `${car}, stops ${stops.join(' ')}, ${clockTime(from)}–${clockTime(to)}`,
    });
  }

  private leftMoving(visit: Visit, next: Visit): void {
    if (!confirms(next, visit)) {
      this.report.push({ rule: 'R8', reason: 'departure not confirmed', detail: described(visit) });
      this.markBetween(stopsPassed(visit), visit, next, 'unconfirmed move');
      return;
    }
    for (const stop of stopsPassed(visit)) {
      this.departures.push({ stop, car: visit.car, at: arrival(next) });
    }
    this.addSegment(visit);
  }

  // A car's first visit is no segment lost: the day holds no arrival for it to be timed from.
  private addSegment(visit: Visit): void {
    if (visit.entry === null) {
      return;
    }
    if (visit.exit === 'GAP') {
      this.report.push({ rule: 'R12', reason: 'left in a GAP', detail: described(visit) });
    } else if (!isTimed(visit.entry)) {
      this.report.push({ rule: 'R12', reason: 'arrival not timed', detail: described(visit) });
    } else if (isLong(visit)) {
      this.report.push({ rule: 'R7', reason: 'LONG visit', detail: described(visit) });
    } else if (bandOf(arrival(visit)) === null) {
      this.report.push({ rule: 'R12', reason: 'arrival outside the bands', detail: described(visit) });
    } else {
      this.segments.push(visit);
    }
  }

  private markBetween(stops: readonly number[], visit: Visit, next: Visit, reason: string): void {
    this.mark({ stops, from: lastSet(visit), to: arrival(next), reason, car: visit.car });
  }

  private leftOtherwise(visit: Visit, next: Visit, move: Move): void {
    this.report.push({ rule: 'R6', reason: `no departure: ${move}`, detail: described(visit) });
    if (move === 'BREAK') {
      this.markBetween(stopsPassed(visit), visit, next, 'BREAK');
    } else if (move === 'ABSENT') {
      if (isTimed(visit.entry) || isTimed(next.exit)) {
        this.markBetween(ALL_STOPS, visit, next, 'ABSENT');
      }
    } else if (isBackward(visit)) {
      this.markBetween([visit.stop], visit, next, 'backward JUMP');
    } else if (lastSet(visit) - arrival(visit) < STOOD_PARKED) {
      const stops = stopsPassed(visit);
      this.mark({ stops, from: arrival(visit), to: arrival(next), reason: 'forward JUMP', car: visit.car });
    }
  }

  private markCarEdges(car: string, visits: Visit[]): void {
    const [firstVisit] = visits;
    const lastVisit = visits.at(-1);
    if (firstVisit === undefined || lastVisit === undefined) {
      return;
    }
    if (arrival(firstVisit) > this.dayStart && !PARKING_STOPS.has(firstVisit.stop)) {
      const to = arrival(firstVisit);
      this.mark({ stops: ALL_STOPS, from: this.dayStart, to, reason: 'first seen mid-day', car });
    }
    if (lastSet(lastVisit) < this.dayEnd) {
      if (PARKING_STOPS.has(lastVisit.stop)) {
        this.report.push({ rule: 'R9', reason: 'left the feed at a parking stop', detail: described(lastVisit) });
      } else {
        const from = lastSet(lastVisit);
        this.mark({ stops: ALL_STOPS, from, to: this.dayEnd, reason: 'lost mid-day', car });
      }
    }
  }

  readCar(car: string, visits: Visit[]): void {
    for (const visit of visits) {
      const { next, exit } = visit;
      if (next !== null && exit !== null) {
        if (isMoving(exit)) {
          this.leftMoving(visit, next);
        } else {
          this.leftOtherwise(visit, next, exit);
        }
      }
    }
    this.markCarEdges(car, visits);
  }

  markSetGaps(times: number[]): void {
    for (const [index, to] of times.slice(1).entries()) {
      const from = times[index];
      if (from !== undefined && to - from >= FASTEST_LAP) {
        this.mark({ stops: ALL_STOPS, from, to, reason: 'set gap', car: 'all cars' });
      }
    }
  }

  // R10.
  buildHeadways(): Headway[] {
    return ALL_STOPS.flatMap((stop) => {
      const times = this.departures
        .filter((departure) => departure.stop === stop)
        .map(({ at }) => at)
        .toSorted((a, b) => a - b);
      return times.slice(1).map((end, index): Headway => {
        const start = times[index] ?? end;
        const window = this.windows.find(({ stops, from, to }) => stops.includes(stop) && from < end && to > start);
        if (window !== undefined) {
          this.report.push({
            rule: 'R10',
            reason: `headway dropped: ${window.reason}`,
            detail: `stop ${stop}, ${clockTime(start)}–${clockTime(end)}`,
          });
        }
        return { stop, start, end, droppedFor: window?.reason ?? null };
      });
    });
  }
}

export function cleanDay({ date, sets }: ShuttleDay): CleanedDay {
  const times = sets.map(({ at }) => at);
  const cleaning = new DayCleaning(times[0] ?? 0, times.at(-1) ?? 0);
  const visits = new Map<string, Visit[]>();
  for (const [car, sightings] of sightingsByCar(sets)) {
    const carVisits = visitsOf(car, sightings, cleaning.report);
    visits.set(car, carVisits);
    cleaning.readCar(car, carVisits);
  }
  cleaning.markSetGaps(times);
  const headways = cleaning.buildHeadways();
  const { departures, windows, segments, report } = cleaning;
  return { date, visits, departures, windows, headways, segments, report };
}
