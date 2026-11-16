/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MINUTE_MS } from '../gathering/gathering.js';

// The order of the Tutorial Quests the User walks to: of every order of at most five stops that ends before their next
// item, the one with the most stops, then the one done first, then the shortest total walk, the walk on to the next
// item included. Ending first comes before walking less, so that a short walk to an office that has not opened yet does
// not win over the stops that can be done now. Five stops make 120 orders, so every order is tried.

export const STOPS_MAX = 5;

// What one stop takes, as board q12's "받는 데 10분", until the content gives a quest minutes of its own.
export const STOP_MINUTES = 10;

// With no next item the order ends when campus offices close, so that a stop without hours is not offered at night.
export const NO_NEXT_CLOSING = '18:00';

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
  // The next item, which the order ends before, with its Place when it has one; null with none later that day.
  until: { placeId: string | null; at: Date } | null;
  // When the order ends with no next item.
  closing: Date;
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
  // Null when there is no next item, or it has no Place.
  onwardMinutes: number | null;
  // `closed`: its hours leave no stop between the User's arrival and the deadline. `no-time`: the gap is too short
  // whatever the hours, or it fits alone but not with the others. `more`: one more than five.
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
export function stayStart({ open, stayMinutes }: Pick<Stop, 'open' | 'stayMinutes'>, arrival: Date): Date | null {
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
  if (one.end.getTime() !== best.end.getTime()) {
    return one.end < best.end;
  }
  return one.walkMinutes < best.walkMinutes;
}

const onwardFrom = ({ until, walkMinutes }: OrderArgs, placeId: string): number | null =>
  until === null || until.placeId === null ? null : walkMinutes(placeId, until.placeId);

function visitOf(
  stop: Stop,
  from: { placeId: string; at: Date },
  walkMinutes: OrderArgs['walkMinutes'],
  deadline: Date,
): Visit | null {
  const walk = walkMinutes(from.placeId, stop.placeId);
  const arrival = plus(from.at, walk);
  const start = stayStart(stop, arrival);
  if (start === null) {
    return null;
  }
  const end = plus(start, stop.stayMinutes);
  return end > deadline ? null : { stop, arrival, start, end, walkMinutes: walk };
}

// Every order of at most five stops, depth first, keeping the best that ends in time for the next item.
function bestOrder(args: OrderArgs, deadline: Date): Candidate | null {
  const { from, until, stops, walkMinutes } = args;
  const used = stops.map(() => false);
  const visits: Visit[] = [];
  const found: { best: Candidate | null } = { best: null };
  const consider = (placeId: string, at: Date, walked: number): void => {
    const onward = onwardFrom(args, placeId);
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

// Why a stop is left out, judged as the only stop after the walk to it, so that the reason holds whatever the others.
function reasonOf(stop: Stop, args: OrderArgs, deadline: Date, chosen: number): Order['left'][number]['reason'] {
  const arrival = plus(args.from.at, args.walkMinutes(args.from.placeId, stop.placeId));
  const latestEnd = plus(deadline, -(onwardFrom(args, stop.placeId) ?? 0));
  if (plus(arrival, stop.stayMinutes) > latestEnd) {
    return 'no-time';
  }
  const start = stayStart(stop, arrival);
  if (start === null || plus(start, stop.stayMinutes) > latestEnd) {
    return 'closed';
  }
  return chosen === STOPS_MAX ? 'more' : 'no-time';
}

export function orderOf(args: OrderArgs): Order {
  const { from, until, closing, stops } = args;
  const deadline = until?.at ?? closing;
  const chosen = bestOrder(args, deadline) ?? { visits: [], walkMinutes: 0, onwardMinutes: null, end: from.at };
  const keys = new Set(chosen.visits.map(({ stop }) => stop.key));
  return {
    visits: chosen.visits,
    walkMinutes: chosen.walkMinutes,
    onwardMinutes: chosen.onwardMinutes,
    left: stops
      .filter(({ key }) => !keys.has(key))
      .map((stop) => ({ stop, reason: reasonOf(stop, args, deadline, chosen.visits.length) })),
  };
}
