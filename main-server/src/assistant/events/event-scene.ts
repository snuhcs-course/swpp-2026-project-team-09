/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Position } from '../../common/geometry.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { type EventsInput, type MapScene, type PlacePoint, type TimeBand } from '../dto/answer.dto.js';
import { clockOf, type DayItem } from '../free-time/free-time.js';
import { type AnswerPerson, placeLabelOf, withAnd } from '../gathering/answer-words.js';
import { MINUTE_MS } from '../gathering/gathering.js';
import { busyIn } from '../gathering/meal-scene.js';
import { clockWithDay, koreaTime } from '../korea-time.js';
import { type EventPlan, type EventPlanning, type PlacedEvent, type Way } from './event-fit.js';

// What the map draws of an event's plan, its time band, and how its Places are called.

// What the naming, the scene, and the band read: who asks, when, and the Places.
export interface NamingArgs {
  now: Date;
  asker: AnswerPerson;
  placeOf: (placeId: string) => PlaceDto;
}

export interface EventAnswerArgs extends NamingArgs {
  input: EventsInput;
  planning: EventPlanning;
}

const HALF_HOUR_MS = 30 * MINUTE_MS;
// The band reaches this far before a plan's start, unless now is later, and this far past its end.
const BAND_BEFORE_MS = 60 * MINUTE_MS;
const BAND_AFTER_MS = 30 * MINUTE_MS;

export const itemWord = ({ isClass }: DayItem): string => (isClass ? '수업' : '일정');

export const byWord = ({ mode }: Way): string => (mode === 'shuttle' ? '셔틀로' : '걸어서');

// A route or a part says the shuttle, and nothing for a walk.
export const modeOf = (way: Way | null): { mode?: 'shuttle' } => (way?.mode === 'shuttle' ? { mode: 'shuttle' } : {});

// How Places are called: a Place by placeLabelOf, the event's by its own words.
export class EventNaming<Args extends NamingArgs = EventAnswerArgs> {
  constructor(readonly args: Args) {}

  placeLabel(placeId: string): string {
    return placeLabelOf(this.args.placeOf(placeId));
  }

  position(placeId: string): Position {
    const { latitude, longitude } = this.args.placeOf(placeId);
    return { latitude, longitude };
  }

  placePoint(placeId: string): PlacePoint {
    return { placeId, label: this.placeLabel(placeId), ...this.position(placeId) };
  }

  eventWords({ place, placeId }: PlacedEvent): string {
    return place ?? this.placeLabel(placeId);
  }

  eventPoint(event: PlacedEvent): PlacePoint {
    return { placeId: event.placeId, label: this.eventWords(event), ...this.position(event.placeId) };
  }
}

function scenePeople({ origin, there }: EventPlan, naming: EventNaming<NamingArgs>): MapScene['people'] {
  if (origin === null) {
    return [];
  }
  const { userId, name, position } = naming.args.asker;
  const exact = origin.basis === 'location' ? position : null;
  return [
    {
      userId,
      name,
      me: true,
      at: exact ?? naming.position(origin.placeId),
      source: exact === null ? 'timetable' : 'exact',
      tag: there !== null && there.minutes > 0 ? `나 · ${there.minutes}분` : '나',
    },
  ];
}

function scenePlaces({ event, next }: EventPlan, naming: EventNaming<NamingArgs>): MapScene['places'] {
  const places: MapScene['places'] = [{ place: naming.eventPoint(event), role: 'pick', tag: event.title }];
  const nextPlaceId = next?.item.placeId ?? null;
  if (next !== null && nextPlaceId !== null) {
    const clock = next.item.isClass ? `${clockOf(next.item.start)} 수업` : clockOf(next.item.start);
    places.push({
      place: naming.placePoint(nextPlaceId),
      role: 'next',
      tag: `${clock} · ${naming.placeLabel(nextPlaceId)}`,
    });
  }
  return places;
}

// The asker's way there, and on to their next item.
function sceneRoutes({ event, origin, there, next }: EventPlan, naming: EventNaming<NamingArgs>): MapScene['routes'] {
  const { userId } = naming.args.asker;
  const to = naming.position(event.placeId);
  const routes: MapScene['routes'] = [];
  if (origin !== null && there !== null) {
    routes.push({
      userId,
      role: 'me',
      from: naming.position(origin.placeId),
      to,
      minutes: there.minutes,
      ...modeOf(there),
    });
  }
  const nextPlaceId = next?.item.placeId ?? null;
  if (next !== null && next.way !== null && nextPlaceId !== null) {
    const { way } = next;
    routes.push({
      userId,
      role: 'next',
      from: to,
      to: naming.position(nextPlaceId),
      minutes: way.minutes,
      ...modeOf(way),
    });
  }
  return routes.filter(({ minutes }) => minutes > 0);
}

// An event's own times: "06:00–08:00", or "06:00 시작" with no end.
export function eventTimes({ start, end }: { start: Date; end: Date | null }): string {
  return end === null ? `${clockOf(start)} 시작` : `${clockOf(start)}–${clockOf(end)}`;
}

// The flag of an event under way gives its own times, not the asker's arrival, which would read as its start; one
// that starts on another day gives its day.
function flagText({ event, start }: EventPlan, now: Date): string {
  const times = event.start < start ? eventTimes(event) : clockWithDay(start, now);
  return `${times} ${event.title}`;
}

export function sceneOf(plan: EventPlan, naming: EventNaming<NamingArgs>): MapScene {
  const { event } = plan;
  return {
    people: scenePeople(plan, naming),
    places: scenePlaces(plan, naming),
    routes: sceneRoutes(plan, naming),
    flags: [{ at: naming.position(event.placeId), text: flagText(plan, naming.args.now), role: 'place' }],
  };
}

// From the half hour at or before the later of now and an hour before the plan's start, to the half hour at or after
// half an hour past its end: the asker's lane, then the others', and the time they are there.
export function bandOf(
  { state, start, end, stayMinutes, clash }: EventPlan,
  naming: EventNaming<NamingArgs>,
  others: readonly AnswerPerson[] = [],
): TimeBand {
  const { now, asker } = naming.args;
  const from = new Date(
    Math.floor(Math.max(now.getTime(), start.getTime() - BAND_BEFORE_MS) / HALF_HOUR_MS) * HALF_HOUR_MS,
  );
  const until = new Date(Math.ceil((end.getTime() + BAND_AFTER_MS) / HALF_HOUR_MS) * HALF_HOUR_MS);
  const span = `${clockOf(start)}–${clockOf(end)}`;
  return {
    range: { startAt: koreaTime(from), endAt: koreaTime(until) },
    now: koreaTime(now),
    lanes: [{ ...asker, name: '나' }, ...others].map(({ userId, name, items }) => ({
      userId,
      name,
      busy: busyIn(items, from, until, (placeId) => naming.placeLabel(placeId)),
    })),
    startAt: koreaTime(start),
    endAt: koreaTime(end),
    text:
      state === 'clash' && clash !== null
        ? `${span} · ${withAnd(itemWord(clash))} 겹쳐요`
        : `${span} · ${stayMinutes}분`,
  };
}
