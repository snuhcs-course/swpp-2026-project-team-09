/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { SHORTEST_STAY_SECONDS } from '../../travel/judgement-constants.js';
import { shownMinutes, type TravelMode, type TravelProvider } from '../../travel/travel.js';
import { byStart, type DayItem, type FreeInterval, freeTimeOf } from '../free-time/free-time.js';
import { earliest, latest } from '../free-time/meal-fit.js';
import { MINUTE_MS, minutesBetween, originOf, type PersonPart } from '../gathering/gathering.js';

// Which Global Events of a day the asker can attend between their items, and how. A way counts its shown minutes, as
// a meal's plan does, so every time of a plan is a whole minute when the event's are.

export interface DayEvent {
  id: string;
  title: string;
  start: Date;
  end: Date | null;
  // Null when the event's place is no Place of the list.
  placeId: string | null;
  // The event's own words for its place.
  place: string | null;
}

export type PlacedEvent = DayEvent & { placeId: string };

export interface Way {
  minutes: number;
  mode: TravelMode;
}

export interface EventPlan {
  event: PlacedEvent;
  // Under way when the asker can first be there, not started then, or lying over one of their items.
  state: 'under-way' | 'not-started' | 'clash';
  // When the asker is there.
  start: Date;
  end: Date;
  stayMinutes: number;
  origin: PersonPart['origin'];
  // The way there and when they set out, null when the origin is unknown.
  there: Way | null;
  leaveAt: Date | null;
  // The item after and the way on to its Place, null when it has none. Null when nothing follows, and for a clash.
  next: { item: DayItem; way: Way | null } | null;
  leaveBy: Date | null;
  // The item it lies over.
  clash: DayItem | null;
}

export type DropReason = { kind: 'late'; arriveAt: Date } | { kind: 'short'; minutes: number };

export interface EventDrop {
  event: PlacedEvent;
  reason: DropReason;
}

export interface EventDay {
  items: readonly DayItem[];
  date: string;
  // A whole minute.
  now: Date;
  locationPlaceId: string | null;
  events: readonly DayEvent[];
}

export interface EventPlanning {
  // Where the asker sets out from now or next, and the item that ends that stretch, for the chips.
  first: { origin: PersonPart['origin']; next: DayItem | null } | null;
  plans: EventPlan[];
  dropped: EventDrop[];
}

const SHORTEST_STAY_MINUTES = SHORTEST_STAY_SECONDS / 60;

const plusMinutes = (at: Date, count: number): Date => new Date(at.getTime() + count * MINUTE_MS);

// An event with no end is taken as the 공강 cards take a candidate with none: the asker stays the shortest stay.
const endOf = ({ start, end }: DayEvent): Date => end ?? plusMinutes(start, SHORTEST_STAY_MINUTES);

function wayAt(from: string, to: string, departure: Date, travel: TravelProvider): Way {
  if (from === to) {
    return { minutes: 0, mode: 'walk' };
  }
  const { seconds, mode } = travel.travel(from, to, departure);
  return { minutes: shownMinutes(seconds), mode };
}

// The way to be somewhere by a time: the shuttle or the walk of a departure by which the walk would still be in time.
function wayBy(from: string, to: string, arriveBy: Date, travel: TravelProvider): Way {
  return wayAt(from, to, new Date(arriveBy.getTime() - travel.walkingSeconds(from, to) * 1000), travel);
}

interface Attempt extends Omit<EventPlan, 'clash'> {
  arriveAt: Date;
  fits: boolean;
}

function nextOf(event: PlacedEvent, item: DayItem | null, travel: TravelProvider): EventPlan['next'] {
  if (item === null) {
    return null;
  }
  return { item, way: item.placeId === null ? null : wayBy(event.placeId, item.placeId, item.start, travel) };
}

// How the asker could attend the event from one stretch of Free Time.
function attempt(event: PlacedEvent, stretch: FreeInterval, day: EventDay, travel: TravelProvider): Attempt {
  const origin = originOf({ locationPlaceId: day.locationPlaceId }, stretch, day.now);
  const first = origin === null ? null : wayAt(origin.placeId, event.placeId, stretch.start, travel);
  const arriveAt = plusMinutes(stretch.start, first?.minutes ?? 0);
  const underWay = arriveAt > event.start;
  // Before the start they set out as late as still has them there at the start.
  const there = origin === null || underWay ? first : wayBy(origin.placeId, event.placeId, event.start, travel);
  const next = nextOf(event, stretch.next, travel);
  const leaveBy = next === null ? null : plusMinutes(next.item.start, -(next.way?.minutes ?? 0));
  const start = underWay ? arriveAt : event.start;
  const end = earliest([endOf(event), leaveBy ?? stretch.end]);
  const stayMinutes = Math.floor(minutesBetween(start, end));
  const fits = underWay || event.end === null ? stayMinutes >= SHORTEST_STAY_MINUTES : stayMinutes > 0;
  return {
    event,
    state: underWay ? 'under-way' : 'not-started',
    start,
    end,
    stayMinutes,
    origin,
    there,
    leaveAt: there === null ? null : underWay ? stretch.start : plusMinutes(event.start, -there.minutes),
    next,
    leaveBy,
    arriveAt,
    fits,
  };
}

// The first item that lies over what is left of the event.
function clashOf(event: PlacedEvent, { items, now }: EventDay): DayItem | null {
  const from = latest([event.start, now]);
  return items.toSorted(byStart).find(({ start, end }) => start < endOf(event) && end > from) ?? null;
}

// A clash is planned as if the asker went from where they are now or next.
function clashPlan(
  event: PlacedEvent,
  clash: DayItem,
  first: FreeInterval | undefined,
  day: EventDay,
  travel: TravelProvider,
): EventPlan {
  const origin = first === undefined ? null : originOf({ locationPlaceId: day.locationPlaceId }, first, day.now);
  const start = latest([event.start, day.now]);
  const end = endOf(event);
  const there = origin === null ? null : wayBy(origin.placeId, event.placeId, start, travel);
  return {
    event,
    state: 'clash',
    start,
    end,
    stayMinutes: Math.floor(minutesBetween(start, end)),
    origin,
    there,
    leaveAt: there === null ? null : plusMinutes(start, -there.minutes),
    next: null,
    leaveBy: null,
    clash,
  };
}

function dropOf(event: PlacedEvent, best: Attempt | undefined): EventDrop {
  if (best !== undefined && best.state === 'under-way' && event.end === null) {
    return { event, reason: { kind: 'late', arriveAt: best.arriveAt } };
  }
  return { event, reason: { kind: 'short', minutes: Math.max(0, best?.stayMinutes ?? 0) } };
}

function fitOne(
  event: PlacedEvent,
  stretches: readonly FreeInterval[],
  day: EventDay,
  travel: TravelProvider,
): EventPlan | EventDrop {
  const attempts = stretches
    .filter(({ start, end }) => start < endOf(event) && end > event.start)
    .map((stretch) => attempt(event, stretch, day, travel));
  const best = attempts.toSorted((a, b) => Number(b.fits) - Number(a.fits) || b.stayMinutes - a.stayMinutes)[0];
  if (best !== undefined && best.fits) {
    const { arriveAt: _arriveAt, fits: _fits, ...plan } = best;
    return { ...plan, clash: null };
  }
  const clash = clashOf(event, day);
  return clash === null ? dropOf(event, best) : clashPlan(event, clash, stretches[0], day, travel);
}

const byTitle = (a: EventPlan, b: EventPlan): number =>
  a.event.title < b.event.title ? -1 : Number(a.event.title > b.event.title);

// The plans that fit, the longer stay first, then the earlier start, then the title; then those that clash, by start.
function byOrder(a: EventPlan, b: EventPlan): number {
  const clashing = Number(a.state === 'clash') - Number(b.state === 'clash');
  const longer = a.state === 'clash' ? 0 : b.stayMinutes - a.stayMinutes;
  return clashing || longer || a.start.getTime() - b.start.getTime() || byTitle(a, b);
}

export function fitEvents(day: EventDay, travel: TravelProvider): EventPlanning {
  const stretches = freeTimeOf(day.items, day.date, day.now);
  const fitted = day.events
    .filter((event): event is PlacedEvent => event.placeId !== null && endOf(event) > day.now)
    .map((event) => fitOne(event, stretches, day, travel));
  const [stretch] = stretches;
  return {
    first:
      stretch === undefined
        ? null
        : { origin: originOf({ locationPlaceId: day.locationPlaceId }, stretch, day.now), next: stretch.next },
    plans: fitted.filter((each): each is EventPlan => 'state' in each).toSorted(byOrder),
    dropped: fitted.filter((each): each is EventDrop => !('state' in each)),
  };
}
