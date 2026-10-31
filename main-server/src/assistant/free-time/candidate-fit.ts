/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { ARRIVAL_MARGIN_SECONDS, SHORTEST_STAY_SECONDS } from '../../travel/judgement-constants.js';
import { shownMinutes, type TravelMode, type TravelProvider } from '../../travel/travel.js';
import { clockOf, endsInTime } from './free-time.js';

// Whether a recruiting Quest or a Global Event fits a gap, and what its card then says. Every comparison uses the exact
// seconds: rounding is only for what is shown.

const ARRIVAL_MARGIN_MS = ARRIVAL_MARGIN_SECONDS * 1000;

// What a candidate is judged on: for a Quest, its first Sub Quest that starts inside the gap.
export interface Candidate {
  start: Date;
  end: Date | null;
  placeId: string;
}

// What is on the far side of a gap: the next item, or the time the User told they must leave by.
export type AfterGap = { kind: 'item'; at: Date; placeId: string; isClass: boolean } | { kind: 'leaveBy'; at: Date };

export interface Gap {
  // When the User leaves the previous item, and from which Place. Null with no item before the gap.
  leavesAt: Date;
  origin: string | null;
  after: AfterGap | null;
  // The latest a candidate's end may be, when a clock time narrows the gap.
  endsBy: Date | null;
}

// The 이동 시간 box of a candidate that fits. Each part is there only when it applies.
export interface TravelBox {
  travel?: { mode: TravelMode; minutes: number };
  next?: { minutes: number; isClass: boolean };
  // HH:MM in Korea.
  leaveBy?: string;
  endUnknown?: boolean;
}

function later(at: Date, seconds: number): Date {
  return new Date(at.getTime() + seconds * 1000);
}

// The way there, when the User can arrive in time. Null when they cannot.
function wayThere(
  { start, placeId }: Candidate,
  { leavesAt, origin }: Gap,
  travel: TravelProvider,
  now: Date,
): TravelBox | null {
  if (origin === null) {
    return start > now ? {} : null;
  }
  const way = travel.travel(origin, placeId, leavesAt);
  const arrives = later(leavesAt, way.seconds);
  if (arrives.getTime() > start.getTime() - ARRIVAL_MARGIN_MS) {
    return null;
  }
  return { travel: { mode: way.mode, minutes: shownMinutes(way.seconds) } };
}

// The leave-by box of a candidate with no end, or a longer one, when the User can stay long enough before it.
function leavingBy({ start, end }: Candidate, leaveBy: Date): TravelBox | null {
  if (leaveBy < later(start, SHORTEST_STAY_SECONDS)) {
    return null;
  }
  return { leaveBy: clockOf(leaveBy), ...(end === null ? { endUnknown: true } : {}) };
}

// When the User must leave a candidate to reach the next item: the shuttle or the walk is that of a departure by which
// the walk would still be in time.
function leaveFor(
  { placeId }: Candidate,
  { at, placeId: nextPlaceId }: { at: Date; placeId: string },
  travel: TravelProvider,
): Date {
  const arrivesBy = new Date(at.getTime() - ARRIVAL_MARGIN_MS);
  const departure = later(arrivesBy, -travel.walkingSeconds(placeId, nextPlaceId));
  return later(arrivesBy, -travel.travel(placeId, nextPlaceId, departure).seconds);
}

function wayAfter(candidate: Candidate, { after }: Gap, travel: TravelProvider): TravelBox | null {
  const { start, end, placeId } = candidate;
  if (after === null) {
    return {};
  }
  if (after.kind === 'leaveBy') {
    if (!endsInTime(start, end)) {
      return leavingBy(candidate, after.at);
    }
    return end <= after.at ? {} : null;
  }
  if (!endsInTime(start, end)) {
    return leavingBy(candidate, leaveFor(candidate, after, travel));
  }
  const way = travel.travel(placeId, after.placeId, end);
  if (later(end, way.seconds).getTime() > after.at.getTime() - ARRIVAL_MARGIN_MS) {
    return null;
  }
  return { next: { minutes: shownMinutes(way.seconds), isClass: after.isClass } };
}

// The box of a candidate that fits the gap, or null. The caller has found that it starts inside the gap.
export function fitOf(candidate: Candidate, gap: Gap, travel: TravelProvider, now: Date): TravelBox | null {
  if (gap.endsBy !== null && candidate.end !== null && candidate.end > gap.endsBy) {
    return null;
  }
  const there = wayThere(candidate, gap, travel, now);
  const after = there === null ? null : wayAfter(candidate, gap, travel);
  return after === null ? null : { ...there, ...after };
}
