/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { OPEN_SUB_QUEST_SECONDS } from '../../travel/judgement-constants.js';
import { type TravelProvider } from '../../travel/travel.js';
import { type EventPlan, plusMinutes, type Way, wayAt, wayBy } from '../events/event-fit.js';
import { type DayItem, type FreeInterval, freeTimeOf } from '../free-time/free-time.js';
import { earliest, latest } from '../free-time/meal-fit.js';
import { MINUTE_MS, minutesBetween, originOf, type PersonPart } from '../gathering/gathering.js';

// When and how everyone of a new recruiting Quest gets to its Place: the time said, or the earliest everyone can be
// there rounded up to the next ten minutes, each person's way, until when they stay, and the Friends free then.

export interface NewQuestPerson {
  userId: string;
  items: readonly DayItem[];
  // The asker's only.
  locationPlaceId: string | null;
}

export interface NewQuestDay {
  date: string;
  // A whole minute.
  now: Date;
  placeId: string;
  // A Global Event's: nobody meets before it starts, and the stay ends with it.
  event: { start: Date; end: Date | null } | null;
  // The time said.
  time: Date | null;
  // The asker first.
  people: readonly NewQuestPerson[];
  // The asker's other Friends who could come.
  others: readonly Pick<NewQuestPerson, 'userId' | 'items'>[];
}

export interface PersonWay {
  userId: string;
  // No Free Time at the time.
  busy: boolean;
  origin: PersonPart['origin'];
  // The time is after now and they are not free then, or the stretch they are free in starts after now: they set out
  // from an item, not from where they are.
  later: boolean;
  // The way to be there by the time, null when the origin is unknown.
  there: Way | null;
  leaveAt: Date | null;
  next: EventPlan['next'];
  leaveBy: Date | null;
}

export interface NewQuestPlanning {
  start: Date;
  end: Date;
  minutes: number;
  // Whose arrival, rounded up, set the time; null when it was said, or is the Global Event's start.
  decidedBy: { userId: string; arriveAt: Date } | null;
  // In the order of the people.
  ways: PersonWay[];
  // The others free at the time, with the stretch they are free in.
  candidates: { userId: string; stretch: FreeInterval }[];
  // The asker is free at the time and can stay a minute or more.
  fits: boolean;
}

const STEP_MS = 10 * MINUTE_MS;
const OPEN_MINUTES = OPEN_SUB_QUEST_SECONDS / 60;

const roundedUp = (at: Date): Date => new Date(Math.ceil(at.getTime() / STEP_MS) * STEP_MS);

const stretchesOf = (items: readonly DayItem[], { date, now }: NewQuestDay): FreeInterval[] =>
  freeTimeOf(items, date, now);

const holding = (stretches: readonly FreeInterval[], at: Date): FreeInterval | undefined =>
  stretches.find(({ start, end }) => start <= at && at < end);

// When the person can first be at the Place after `from`: from the first stretch of Free Time still on then.
function arrivalOf(person: NewQuestPerson, from: Date, day: NewQuestDay, travel: TravelProvider): Date | null {
  const stretch = stretchesOf(person.items, day).find(({ end }) => end > from);
  if (stretch === undefined) {
    return null;
  }
  const origin = originOf({ locationPlaceId: person.locationPlaceId }, stretch, day.now);
  const way = origin === null ? null : wayAt(origin.placeId, day.placeId, stretch.start, travel);
  return plusMinutes(stretch.start, way?.minutes ?? 0);
}

function timeOf(day: NewQuestDay, travel: TravelProvider): Pick<NewQuestPlanning, 'start' | 'decidedBy'> {
  if (day.time !== null) {
    return { start: day.time, decidedBy: null };
  }
  const from = latest([day.now, day.event?.start ?? day.now]);
  const arrivals = day.people.flatMap((person) => {
    const arriveAt = arrivalOf(person, from, day, travel);
    return arriveAt === null ? [] : [{ userId: person.userId, arriveAt }];
  });
  const last = arrivals.reduce<(typeof arrivals)[number] | null>(
    (latestSoFar, each) => (latestSoFar === null || each.arriveAt > latestSoFar.arriveAt ? each : latestSoFar),
    null,
  );
  return last === null || last.arriveAt <= from
    ? { start: roundedUp(from), decidedBy: null }
    : { start: roundedUp(last.arriveAt), decidedBy: last };
}

// The person's way to be there at the start, from the stretch of Free Time the start lies in.
function wayOf(person: NewQuestPerson, start: Date, day: NewQuestDay, travel: TravelProvider): PersonWay {
  const stretch = holding(stretchesOf(person.items, day), start);
  if (stretch === undefined) {
    const later = start > day.now;
    return {
      userId: person.userId,
      busy: true,
      origin: null,
      later,
      there: null,
      leaveAt: null,
      next: null,
      leaveBy: null,
    };
  }
  const origin = originOf({ locationPlaceId: person.locationPlaceId }, stretch, day.now);
  const there = origin === null ? null : wayBy(origin.placeId, day.placeId, start, travel);
  const item = stretch.next;
  const next =
    item === null
      ? null
      : { item, way: item.placeId === null ? null : wayBy(day.placeId, item.placeId, item.start, travel) };
  return {
    userId: person.userId,
    busy: false,
    origin,
    later: stretch.start > day.now,
    there,
    // One who cannot be there in time sets out once free.
    leaveAt: there === null ? null : latest([stretch.start, plusMinutes(start, -there.minutes)]),
    next,
    leaveBy: next === null ? null : plusMinutes(next.item.start, -(next.way?.minutes ?? 0)),
  };
}

// The Global Event's end, or an activity's, which has none of its own, after the shortest stay; earlier when someone
// must leave for their next item.
function endOf(start: Date, ways: readonly PersonWay[], { event }: NewQuestDay): Date {
  const own = event === null ? plusMinutes(start, OPEN_MINUTES) : (event.end ?? plusMinutes(event.start, OPEN_MINUTES));
  return earliest([own, ...ways.flatMap(({ leaveBy }) => leaveBy ?? [])]);
}

export function fitNewQuest(day: NewQuestDay, travel: TravelProvider): NewQuestPlanning {
  const { start, decidedBy } = timeOf(day, travel);
  const ways = day.people.map((person) => wayOf(person, start, day, travel));
  const end = endOf(start, ways, day);
  const minutes = Math.floor(minutesBetween(start, end));
  return {
    start,
    end,
    minutes,
    decidedBy,
    ways,
    candidates: day.others.flatMap(({ userId, items }) => {
      const stretch = holding(stretchesOf(items, day), start);
      return stretch === undefined ? [] : [{ userId, stretch }];
    }),
    fits: ways[0] !== undefined && !ways[0].busy && minutes >= 1,
  };
}
