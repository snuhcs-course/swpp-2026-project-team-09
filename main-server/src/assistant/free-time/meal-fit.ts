/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Meal } from '../../generated/prisma/client.js';
import {
  ARRIVAL_MARGIN_SECONDS,
  MEAL_START_STEP_SECONDS,
  MEAL_WINDOWS,
  SHORTEST_MEAL_SECONDS,
} from '../../travel/judgement-constants.js';
import { shownMinutes, type Travel, type TravelMode, type TravelProvider } from '../../travel/travel.js';
import { type FreeInterval, onDay } from './free-time.js';

// Who can eat when, and where a meal fits. Nothing here is sent to the model as it is, and every comparison uses the
// exact seconds: rounding is only for what is shown.

export type HandledMeal = Extract<Meal, 'lunch' | 'dinner'>;

export interface Interval {
  start: Date;
  end: Date;
}

// A person of a meal: the name their card shows, their Free Time that day, and for the User, what they answered when
// a tool asked. It takes the place of an item without a Place, and is used for this request alone.
export interface Diner {
  name: string;
  free: readonly FreeInterval[];
  departurePlace: string | null;
  leaveBy: Date | null;
}

// How a person gets there, as a card shows it: their way, or none ("—").
export interface WayShown {
  name: string;
  mode: TravelMode | null;
  minutes: number | null;
  longest: boolean;
}

export interface MealFit {
  start: Date;
  // Rounded down.
  eatingMinutes: number;
  people: WayShown[];
}

const later = (at: Date, seconds: number): Date => new Date(at.getTime() + seconds * 1000);

const latest = (times: readonly Date[]): Date => new Date(Math.max(...times.map((at) => at.getTime())));

const earliest = (times: readonly Date[]): Date => new Date(Math.min(...times.map((at) => at.getTime())));

const secondsBetween = (from: Date, to: Date): number => (to.getTime() - from.getTime()) / 1000;

// A time window of two clock times, as the tools take one.
export interface ClockWindow {
  from: string;
  to: string;
}

export function askedWindow(date: string, { from, to }: ClockWindow): Interval {
  return { start: onDay(date, from), end: onDay(date, to) };
}

// The meal's window on that day, narrowed on both sides by a window asked for. It may come out empty.
export function mealWindow(date: string, meal: HandledMeal, asked?: ClockWindow): Interval {
  const window = askedWindow(date, MEAL_WINDOWS[meal]);
  if (asked === undefined) {
    return window;
  }
  const { start, end } = askedWindow(date, asked);
  return { start: latest([window.start, start]), end: earliest([window.end, end]) };
}

// Every stretch two lists of intervals share.
export function overlapOf(one: readonly Interval[], other: readonly Interval[]): Interval[] {
  return one.flatMap((a) =>
    other.flatMap((b) => {
      const start = latest([a.start, b.start]);
      const end = earliest([a.end, b.end]);
      return start < end ? [{ start, end }] : [];
    }),
  );
}

// Whether the stretches hold an unbroken one long enough to eat together.
export function longEnough(stretches: readonly Interval[]): boolean {
  return stretches.some(({ start, end }) => secondsBetween(start, end) >= SHORTEST_MEAL_SECONDS);
}

// The Free Time everyone shares inside the window.
export function sharedTime(frees: readonly (readonly Interval[])[], window: Interval): Interval[] {
  return frees.reduce<Interval[]>((shared, free) => overlapOf(shared, free), [window]);
}

// The person's stretch of Free Time that holds the shared interval, which lies inside everyone's.
export function aroundShared(free: readonly FreeInterval[], { start, end }: Interval): FreeInterval {
  const around = free.find((interval) => interval.start <= start && end <= interval.end);
  if (around === undefined) {
    throw new Error('A shared interval lies outside the Free Time of a person who shares it');
  }
  return around;
}

// A person's part of a meal at a Place: when they can arrive and must leave, and how they get there.
interface Part {
  arrival: Date;
  leaveBy: Date;
  shown: Travel | null;
}

// The way to the next item, departing by the time the walk would still be in time.
function wayOut(placeId: string, next: { start: Date; placeId: string | null }, travel: TravelProvider): Travel | null {
  if (next.placeId === null) {
    return null;
  }
  const arrivesBy = later(next.start, -ARRIVAL_MARGIN_SECONDS);
  return travel.travel(placeId, next.placeId, later(arrivesBy, -travel.walkingSeconds(placeId, next.placeId)));
}

function partOf(diner: Diner, shared: Interval, window: Interval, placeId: string, travel: TravelProvider): Part {
  const { start, previous, next } = aroundShared(diner.free, shared);
  const leaves = latest([start, window.start]);
  const origin = previous === null ? null : (previous.placeId ?? diner.departurePlace);
  const wayIn = origin === null ? null : travel.travel(origin, placeId, leaves);
  const out = next === null ? null : wayOut(placeId, next, travel);
  const onTime = next === null ? window.end : later(next.start, -ARRIVAL_MARGIN_SECONDS - (out?.seconds ?? 0));
  return {
    arrival: later(leaves, wayIn?.seconds ?? 0),
    leaveBy: earliest([diner.leaveBy ?? onTime, window.end]),
    shown: previous === null ? out : wayIn,
  };
}

function shownOf(diners: readonly Diner[], parts: readonly Part[]): WayShown[] {
  const minutes = parts.map(({ shown }) => (shown === null ? null : shownMinutes(shown.seconds)));
  const longest = Math.max(...minutes.map((shown) => shown ?? 0));
  return diners.map(({ name }, index) => {
    const shown = minutes[index] ?? null;
    return {
      name,
      mode: parts[index]?.shown?.mode ?? null,
      minutes: shown,
      longest: shown === longest,
    };
  });
}

function roundedUp(at: Date): Date {
  const step = MEAL_START_STEP_SECONDS * 1000;
  return new Date(Math.ceil(at.getTime() / step) * step);
}

function fitIn(
  diners: readonly Diner[],
  shared: Interval,
  window: Interval,
  placeId: string,
  travel: TravelProvider,
): MealFit | null {
  const parts = diners.map((diner) => partOf(diner, shared, window, placeId, travel));
  const start = roundedUp(latest(parts.map(({ arrival }) => arrival)));
  const seconds = secondsBetween(start, earliest(parts.map(({ leaveBy }) => leaveBy)));
  if (seconds < SHORTEST_MEAL_SECONDS) {
    return null;
  }
  return { start, eatingMinutes: Math.floor(seconds / 60), people: shownOf(diners, parts) };
}

// The meal at a Place in the earliest shared interval in which it fits, or null.
export function mealFitAt(
  placeId: string,
  diners: readonly Diner[],
  { shared, window }: { shared: readonly Interval[]; window: Interval },
  travel: TravelProvider,
): MealFit | null {
  for (const interval of shared) {
    const fit = fitIn(diners, interval, window, placeId, travel);
    if (fit !== null) {
      return fit;
    }
  }
  return null;
}

type Fitted = Pick<MealFit, 'people'> & { key: string };

const sum = (ways: readonly number[]): number => ways.reduce((total, minutes) => total + minutes, 0);

function minutesShown({ people }: Fitted): number[] {
  return people.flatMap(({ minutes }) => (minutes === null ? [] : [minutes]));
}

// By the longest Travel Time shown, shortest first; then by their sum; then by name, the key, by code point. A "—" counts
// in neither.
export function byShortestLongestWay(a: Fitted, b: Fitted): number {
  const [waysA, waysB] = [minutesShown(a), minutesShown(b)];
  return (
    Math.max(0, ...waysA) - Math.max(0, ...waysB) ||
    sum(waysA) - sum(waysB) ||
    (a.key < b.key ? -1 : Number(a.key > b.key))
  );
}
