/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MINUTE_MS } from '../gathering/gathering.js';

// The order of the Tutorial Quests the User walks to: of every order of at most five stops that ends before their next
// item, the one with the most stops, then the shortest total walk, the walk on to the next item included, then the one
// done first. Five stops make 120 orders, so every order is tried.

export const STOPS_MAX = 5;

// What one stop takes, as board q12's "받는 데 10분", until the content gives a quest minutes of its own.
export const STOP_MINUTES = 10;

export interface Span {
  from: Date;
  until: Date;
}

export interface Stop {
  key: string;
  placeId: string;
  stayMinutes: number;
  // When it is open that day, in order; null when nothing says.
  open: readonly Span[] | null;
}

export interface OrderArgs {
  // Where and when the User sets out.
  from: { placeId: string; at: Date };
  // The next item, which the order ends before; null with none later that day.
  until: { placeId: string; at: Date } | null;
  dayEnd: Date;
  stops: readonly Stop[];
  walkMinutes: (fromPlaceId: string, toPlaceId: string) => number;
}

export interface Visit {
  stop: Stop;
  arrival: Date;
  // Later than the arrival when the User waits for it to open.
  start: Date;
  end: Date;
  walkMinutes: number;
}

export interface Order {
  visits: Visit[];
  // Every walk, the one on to the next item included.
  walkMinutes: number;
  // The walk on to the next item, or null with none.
  onwardMinutes: number | null;
  // The stops left out: closed until the next item, without the time, or one more than five.
  left: { stop: Stop; reason: 'closed' | 'no-time' | 'more' }[];
}

interface Candidate {
  visits: Visit[];
  walkMinutes: number;
  onwardMinutes: number | null;
  end: Date;
}

const plus = (at: Date, minutes: number): Date => new Date(at.getTime() + minutes * MINUTE_MS);

const later = (one: Date, other: Date): Date => (one > other ? one : other);

// The earliest start at or after the arrival at which the stop is open for its whole stay.
function startOf({ open, stayMinutes }: Stop, arrival: Date): Date | null {
  if (open === null) {
    return arrival;
  }
  for (const { from, until } of open) {
    const start = later(arrival, from);
    if (plus(start, stayMinutes) <= until) {
      return start;
    }
  }
  return null;
}

function better(one: Candidate, best: Candidate | null): boolean {
  if (best === null) {
    return true;
  }
  if (one.visits.length !== best.visits.length) {
    return one.visits.length > best.visits.length;
  }
  if (one.walkMinutes !== best.walkMinutes) {
    return one.walkMinutes < best.walkMinutes;
  }
  return one.end < best.end;
}

// No span lets its whole stay fall between setting out and the deadline.
function closedThen({ open, stayMinutes }: Stop, setOut: Date, deadline: Date): boolean {
  return (
    open !== null &&
    !open.some(({ from, until }) => plus(later(setOut, from), stayMinutes) <= (until < deadline ? until : deadline))
  );
}

// The stop walked to from a place at a time, or null when it is not open for its whole stay before the deadline.
function visitOf(
  stop: Stop,
  from: { placeId: string; at: Date },
  walkMinutes: OrderArgs['walkMinutes'],
  deadline: Date,
): Visit | null {
  const walk = walkMinutes(from.placeId, stop.placeId);
  const arrival = plus(from.at, walk);
  const start = startOf(stop, arrival);
  if (start === null) {
    return null;
  }
  const end = plus(start, stop.stayMinutes);
  return end > deadline ? null : { stop, arrival, start, end, walkMinutes: walk };
}

// Every order of at most five stops, depth first, keeping the best that ends in time for the next item.
function bestOrder({ from, until, stops, walkMinutes }: OrderArgs, deadline: Date): Candidate | null {
  const used = stops.map(() => false);
  const visits: Visit[] = [];
  const found: { best: Candidate | null } = { best: null };
  const consider = (placeId: string, at: Date, walked: number): void => {
    const onward = until === null ? null : walkMinutes(placeId, until.placeId);
    if (until !== null && plus(at, onward ?? 0) > until.at) {
      return;
    }
    const candidate = { visits, walkMinutes: walked + (onward ?? 0), onwardMinutes: onward, end: at };
    if (better(candidate, found.best)) {
      found.best = { ...candidate, visits: [...visits] };
    }
  };
  const extend = (placeId: string, at: Date, walked: number): void => {
    consider(placeId, at, walked);
    if (visits.length === STOPS_MAX) {
      return;
    }
    stops.forEach((stop, index) => {
      const visit = used[index] ? null : visitOf(stop, { placeId, at }, walkMinutes, deadline);
      if (visit === null) {
        return;
      }
      used[index] = true;
      visits.push(visit);
      extend(stop.placeId, visit.end, walked + visit.walkMinutes);
      visits.pop();
      used[index] = false;
    });
  };
  extend(from.placeId, from.at, 0);
  return found.best;
}

export function orderOf(args: OrderArgs): Order {
  const { from, until, dayEnd, stops } = args;
  const deadline = until?.at ?? dayEnd;
  const chosen = bestOrder(args, deadline) ?? { visits: [], walkMinutes: 0, onwardMinutes: null, end: from.at };
  const keys = new Set(chosen.visits.map(({ stop }) => stop.key));
  const reasonOf = (stop: Stop): Order['left'][number]['reason'] => {
    if (closedThen(stop, from.at, deadline)) {
      return 'closed';
    }
    return chosen.visits.length === STOPS_MAX ? 'more' : 'no-time';
  };
  return {
    visits: chosen.visits,
    walkMinutes: chosen.walkMinutes,
    onwardMinutes: chosen.onwardMinutes,
    left: stops.filter(({ key }) => !keys.has(key)).map((stop) => ({ stop, reason: reasonOf(stop) })),
  };
}
