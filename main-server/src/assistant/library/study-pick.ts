/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayItem, onDay, startOfDay } from '../free-time/free-time.js';
import { MINUTE_MS } from '../gathering/gathering.js';
import { clockOfMinutes, minutesOfClock } from './booking-rules.js';

// When a study group books a 관정 group study room: nobody left out, the shortest stay as long as possible.

const DEFAULT_LENGTH_MINUTES = 180;
const SHORTEST_STAY_MINUTES = 30;
const BOOKER_LATEST_MINUTES = 60;

export interface StudyPerson {
  id: string;
  itemsByDate: Readonly<Record<string, readonly DayItem[]>>;
}

export interface StudyFacts {
  // The booker first.
  people: readonly StudyPerson[];
  dates: readonly string[];
  hours: { open: string; close: string };
  stepMinutes: number;
  lengthMinutes?: number;
  kwanjeongPlaceId: string;
  walkingMinutes: (fromPlaceId: string, toPlaceId: string) => number;
  // Today's first start allowed; later days need none.
  earliest?: Date | undefined;
}

export interface StudyStay {
  personId: string;
  from: string;
  until: string;
  minutes: number;
}

export interface StudyBooking {
  date: string;
  start: string;
  end: string;
  stays: StudyStay[];
  shortestMinutes: number;
  totalMinutes: number;
  threeOrMoreMinutes: number;
}

export interface StudyDatePick {
  date: string;
  booking: StudyBooking | null;
}

interface Stretch {
  from: number;
  until: number;
}

const minutesOfDay = (date: string, at: Date): number => (at.getTime() - startOfDay(date).getTime()) / MINUTE_MS;

function walkOf(facts: StudyFacts, placeId: string | null, toKwanjeong: boolean): number {
  if (placeId === null || placeId === facts.kwanjeongPlaceId) {
    return 0;
  }
  return toKwanjeong
    ? facts.walkingMinutes(placeId, facts.kwanjeongPlaceId)
    : facts.walkingMinutes(facts.kwanjeongPlaceId, placeId);
}

// The stretches of a day a person can be in 관정관, as minutes of the day.
function freeStretches(facts: StudyFacts, date: string, items: readonly DayItem[]): Stretch[] {
  const stretches: Stretch[] = [];
  let from = -Infinity;
  for (const { start, end, placeId } of items.toSorted((a, b) => a.start.getTime() - b.start.getTime())) {
    stretches.push({ from, until: Math.floor(minutesOfDay(date, start)) - walkOf(facts, placeId, false) });
    from = Math.max(from, Math.ceil(minutesOfDay(date, end)) + walkOf(facts, placeId, true));
  }
  stretches.push({ from, until: Infinity });
  return stretches;
}

// The longest stretch inside the booking, the earlier on a tie; none when no stretch is inside it.
function stayIn(stretches: readonly Stretch[], start: number, end: number): Stretch | null {
  let best: Stretch | null = null;
  for (const stretch of stretches) {
    const cut = { from: Math.max(stretch.from, start), until: Math.min(stretch.until, end) };
    if (cut.until > cut.from && (best === null || cut.until - cut.from > best.until - best.from)) {
      best = cut;
    }
  }
  return best;
}

function threeOrMore(stays: readonly Stretch[]): number {
  const marks = [...new Set(stays.flatMap(({ from, until }) => [from, until]))].toSorted((a, b) => a - b);
  let minutes = 0;
  for (const [index, from] of marks.slice(0, -1).entries()) {
    const until = marks[index + 1] ?? from;
    const count = stays.filter((stay) => stay.from <= from && stay.until >= until).length;
    minutes += count >= 3 ? until - from : 0;
  }
  return minutes;
}

function bookingAt(
  date: string,
  start: number,
  end: number,
  people: readonly StudyPerson[],
  stays: Stretch[],
): StudyBooking {
  const minutes = stays.map(({ from, until }) => until - from);
  return {
    date,
    start: clockOfMinutes(start),
    end: clockOfMinutes(end),
    stays: stays.map(({ from, until }, index) => ({
      personId: people[index]?.id ?? '',
      from: clockOfMinutes(from),
      until: clockOfMinutes(until),
      minutes: minutes[index] ?? 0,
    })),
    shortestMinutes: Math.min(...minutes),
    totalMinutes: minutes.reduce((sum, each) => sum + each, 0),
    threeOrMoreMinutes: threeOrMore(stays),
  };
}

// The booking at a start, or none when it leaves somebody out or the booker comes too late.
function offeredAt(facts: StudyFacts, date: string, stretches: Stretch[][], start: number): StudyBooking | null {
  const end = start + (facts.lengthMinutes ?? DEFAULT_LENGTH_MINUTES);
  const stays = stretches
    .map((each) => stayIn(each, start, end))
    .filter((stay): stay is Stretch => stay !== null && stay.until - stay.from >= SHORTEST_STAY_MINUTES);
  const [booker] = stays;
  if (stays.length < stretches.length || booker === undefined || booker.from - start > BOOKER_LATEST_MINUTES) {
    return null;
  }
  return bookingAt(date, start, end, facts.people, stays);
}

function better(a: StudyBooking, b: StudyBooking): number {
  return (
    b.shortestMinutes - a.shortestMinutes ||
    b.totalMinutes - a.totalMinutes ||
    a.date.localeCompare(b.date) ||
    a.start.localeCompare(b.start)
  );
}

function bestOn(facts: StudyFacts, date: string): StudyBooking | null {
  const stretches = facts.people.map(({ itemsByDate }) => freeStretches(facts, date, itemsByDate[date] ?? []));
  const close = minutesOfClock(facts.hours.close) - (facts.lengthMinutes ?? DEFAULT_LENGTH_MINUTES);
  let best: StudyBooking | null = null;
  for (let start = minutesOfClock(facts.hours.open); start <= close; start += facts.stepMinutes) {
    const tooEarly = facts.earliest !== undefined && onDay(date, clockOfMinutes(start)) < facts.earliest;
    const booking = tooEarly ? null : offeredAt(facts, date, stretches, start);
    if (booking !== null && (best === null || better(booking, best) < 0)) {
      best = booking;
    }
  }
  return best;
}

// When each person reaches 관정관 for their stay in the booking: the end of the item before it plus the walk, or null
// when no item comes before it that day.
export function arrivalsOf(facts: StudyFacts, booking: StudyBooking): (string | null)[] {
  return facts.people.map(({ itemsByDate }, index) => {
    const stay = booking.stays[index];
    const from = stay === undefined ? -Infinity : minutesOfClock(stay.from);
    const until = stay === undefined ? -Infinity : minutesOfClock(stay.until);
    const stretch = freeStretches(facts, booking.date, itemsByDate[booking.date] ?? []).find(
      (each) => each.from <= from && each.until >= until,
    );
    return stretch === undefined || stretch.from === -Infinity ? null : clockOfMinutes(stretch.from);
  });
}

// Each date's best booking, best first; dates without one last, in their order.
export function pickStudyTime(facts: StudyFacts): StudyDatePick[] {
  const picks = facts.dates.map((date) => ({ date, booking: bestOn(facts, date) }));
  return picks.toSorted((a, b) => {
    if (a.booking === null || b.booking === null) {
      return Number(a.booking === null) - Number(b.booking === null);
    }
    return better(a.booking, b.booking);
  });
}
