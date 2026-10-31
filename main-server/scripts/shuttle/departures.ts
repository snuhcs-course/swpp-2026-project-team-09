/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { SHUTTLE_STOP_COUNT } from '../../src/shuttle/shuttle-timing.ts';
import { bandOf, clockTime, type ReportLine, type ShuttleDay } from './sets.ts';
import { arrival, isLong, LAP, lastSet, MINUTE, type Move, sightingsByCar, type Visit, visitsOf } from './visits.ts';

// Rules R8 to R10 of the shuttle log (the P04 spec): a car's departures from the stops, where one may have gone unseen,
// and the headways that are left.

const STOOD_PARKED = 10 * MINUTE;
const BACKWARD_FROM = 12;

const ALL_STOPS = Array.from({ length: SHUTTLE_STOP_COUNT }, (_, stop) => stop);
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
  return `${visit.car} at stop ${visit.stop}, ${clockTime(arrival(visit))}`;
}

class DayCleaning {
  readonly departures: Departure[] = [];
  readonly windows: UnknownWindow[] = [];
  readonly segments: Visit[] = [];
  readonly report: ReportLine[] = [];

  private mark(stops: readonly number[], from: number, to: number, reason: string, car: string): void {
    this.windows.push({ stops, from, to, reason, car });
    this.report.push({
      rule: 'R9',
      reason: `window: ${reason}`,
      detail: `${car}, stops ${stops.join(' ')}, ${clockTime(from)}–${clockTime(to)}`,
    });
  }

  private leftMoving(visit: Visit, next: Visit): void {
    if (!confirms(next, visit)) {
      this.report.push({ rule: 'R8', reason: 'departure not confirmed', detail: described(visit) });
      this.mark(stopsPassed(visit), lastSet(visit), arrival(next), 'unconfirmed move', visit.car);
      return;
    }
    for (const stop of stopsPassed(visit)) {
      this.departures.push({ stop, car: visit.car, at: arrival(next) });
    }
    this.segmentOf(visit);
  }

  private segmentOf(visit: Visit): void {
    if (visit.exit === 'GAP') {
      this.report.push({ rule: 'R12', reason: 'left in a GAP', detail: described(visit) });
    } else if (visit.entry !== null && !isTimed(visit.entry)) {
      this.report.push({ rule: 'R12', reason: 'arrival not timed', detail: described(visit) });
    } else if (visit.entry !== null && isLong(visit)) {
      this.report.push({ rule: 'R7', reason: 'LONG visit', detail: described(visit) });
    } else if (visit.entry !== null && bandOf(arrival(visit)) === null) {
      this.report.push({ rule: 'R12', reason: 'arrival outside the bands', detail: described(visit) });
    } else if (visit.entry !== null) {
      this.segments.push(visit);
    }
  }

  private leftOtherwise(visit: Visit, next: Visit, move: Move): void {
    this.report.push({ rule: 'R6', reason: `no departure: ${move}`, detail: described(visit) });
    if (move === 'BREAK') {
      this.mark(stopsPassed(visit), lastSet(visit), arrival(next), 'BREAK', visit.car);
    } else if (move === 'ABSENT') {
      if (isTimed(visit.entry) || isTimed(next.exit)) {
        this.mark(ALL_STOPS, lastSet(visit), arrival(next), 'ABSENT', visit.car);
      }
    } else if (isBackward(visit)) {
      this.mark([visit.stop], lastSet(visit), arrival(next), 'backward JUMP', visit.car);
    } else if (lastSet(visit) - arrival(visit) < STOOD_PARKED) {
      this.mark(stopsPassed(visit), arrival(visit), arrival(next), 'forward JUMP', visit.car);
    }
  }

  private carEdges(car: string, visits: Visit[], dayStart: number, dayEnd: number): void {
    const [firstVisit] = visits;
    const lastVisit = visits.at(-1);
    if (firstVisit === undefined || lastVisit === undefined) {
      return;
    }
    if (arrival(firstVisit) > dayStart && !PARKING_STOPS.has(firstVisit.stop)) {
      this.mark(ALL_STOPS, dayStart, arrival(firstVisit), 'first seen mid-day', car);
    }
    if (lastSet(lastVisit) < dayEnd) {
      if (PARKING_STOPS.has(lastVisit.stop)) {
        this.report.push({ rule: 'R9', reason: 'left the feed at a parking stop', detail: described(lastVisit) });
      } else {
        this.mark(ALL_STOPS, lastSet(lastVisit), dayEnd, 'lost mid-day', car);
      }
    }
  }

  car(car: string, visits: Visit[], dayStart: number, dayEnd: number): void {
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
    this.carEdges(car, visits, dayStart, dayEnd);
  }

  setGaps(times: number[]): void {
    for (const [index, to] of times.slice(1).entries()) {
      const from = times[index];
      if (from !== undefined && to - from >= LAP) {
        this.mark(ALL_STOPS, from, to, 'set gap', '-');
      }
    }
  }

  // R10.
  headways(): Headway[] {
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
  const cleaning = new DayCleaning();
  const times = sets.map(({ at }) => at);
  const dayStart = times[0] ?? 0;
  const dayEnd = times.at(-1) ?? 0;
  const visits = new Map<string, Visit[]>();
  for (const [car, sightings] of sightingsByCar(sets)) {
    const carVisits = visitsOf(car, sightings, cleaning.report);
    visits.set(car, carVisits);
    cleaning.car(car, carVisits, dayStart, dayEnd);
  }
  cleaning.setGaps(times);
  const { departures, windows, segments, report } = cleaning;
  return { date, visits, departures, windows, headways: cleaning.headways(), segments, report };
}
