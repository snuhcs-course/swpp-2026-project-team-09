/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { SHORTEST_MEAL_SECONDS } from '../../travel/judgement-constants.js';
import { shownMinutes, type TravelProvider } from '../../travel/travel.js';
import { type FreeInterval } from '../free-time/free-time.js';
import { aroundShared, earliest, type Interval, latest, sharedTime } from '../free-time/meal-fit.js';

export interface GatheringPerson {
  id: string;
  // Their Free Time that day, as freeTimeOf gives it.
  free: readonly FreeInterval[];
  // The Place of the position the asker may use for them now, or null.
  locationPlaceId: string | null;
  // What the asker fixed for them: where they set out from, the earliest they are ready, and the latest they leave.
  chosenPlaceId?: string;
  notBefore?: Date;
  leaveBy?: Date;
}

export interface GatheringPlace {
  key: string;
  placeId: string;
}

export type OriginBasis = 'timetable' | 'location' | 'chosen';

export interface PersonPart {
  personId: string;
  readyAt: Date;
  origin: { placeId: string; basis: OriginBasis } | null;
  // Their whole way, to the merging point and on to the place. Null when the origin is unknown.
  walkMinutes: number | null;
  // The earliest they can be at the place. Null when the origin is unknown.
  canArriveAt: Date | null;
  // When they set out to be there at the start. Null when the origin is unknown.
  leaveAt: Date | null;
  // When they must leave the place. Null when nothing follows.
  leaveBy: Date | null;
  // The walk is from the place to the next item's Place, null when it has none.
  next: { start: Date; placeId: string | null; walkMinutes: number | null } | null;
}

// A person's side of the stretch the plan lies in.
export interface GatheringSide {
  personId: string;
  readyAt: Date;
  origin: PersonPart['origin'];
  next: { start: Date; placeId: string | null } | null;
  // The latest the asker fixed for them to leave.
  leaveBy?: Date;
}

export interface GatheringFit {
  key: string;
  placeId: string;
  start: Date;
  end: Date;
  togetherMinutes: number;
  // The merging point, with the asker first among personIds, and the minutes they walk on from it together.
  meeting: { placeId: string; at: Date; personIds: string[]; onwardMinutes: number } | null;
  // In the order of the people.
  parts: PersonPart[];
}

export interface GatheringDrop {
  key: string;
  placeId: string;
  // Never below 0.
  togetherMinutes: number;
  // Who could stay the shortest on their own, and for how long (never below 0). The first such person on a tie.
  shortest: { personId: string; minutes: number };
}

export interface Gathering {
  // The stretch the plan lies in, or null when the people share none in the window.
  shared: Interval | null;
  // In the order of the people; empty when `shared` is null.
  sides: GatheringSide[];
  fits: GatheringFit[];
  dropped: GatheringDrop[];
}

// A person free now without a location is still at the Place of an item that ended at most this long ago.
export const RECENT_CLASS_MINUTES = 15;

// The most a Friend's way may grow by going through the asker's origin to meet there.
export const DETOUR_MINUTES = 1;

// The asker is the first person. `now` is a whole minute.
export function gather(
  people: readonly [GatheringPerson, ...GatheringPerson[]],
  places: readonly GatheringPlace[],
  when: { window: Interval; now: Date },
  travel: Pick<TravelProvider, 'walkingSeconds'>,
): Gathering {
  const stretches = sharedTime(
    people.map(({ free }) => free),
    when.window,
  );
  const plans = stretches.map((stretch) => planIn(stretch, people, places, when, travel));
  return plans.find(({ fits }) => fits.length > 0) ?? plans[0] ?? { shared: null, sides: [], fits: [], dropped: [] };
}

function planIn(
  stretch: Interval,
  [asker, ...friends]: readonly [GatheringPerson, ...GatheringPerson[]],
  places: readonly GatheringPlace[],
  { window, now }: { window: Interval; now: Date },
  travel: Walking,
): Gathering {
  const sides: [GatheringSide, ...GatheringSide[]] = [
    sideOf(asker, stretch, now),
    ...friends.map((friend) => sideOf(friend, stretch, now)),
  ];
  const all = places.map((place) => fitAt(place, sides, window, travel));
  const fits = all.filter((fit) => fitsTogether(fit)).toSorted(byLongestTogether);
  const dropped = all.filter((fit) => !fitsTogether(fit)).map((fit) => dropOf(fit, window));
  return { shared: stretch, sides, fits, dropped };
}

function byLongestTogether(a: GatheringFit, b: GatheringFit): number {
  return (
    b.togetherMinutes - a.togetherMinutes ||
    a.start.getTime() - b.start.getTime() ||
    (a.key < b.key ? -1 : Number(a.key > b.key))
  );
}

const fitsTogether = ({ togetherMinutes }: GatheringFit): boolean => togetherMinutes >= SHORTEST_MEAL_SECONDS / 60;

function dropOf({ key, placeId, togetherMinutes, parts }: GatheringFit, window: Interval): GatheringDrop {
  const stays = parts.map(({ personId, canArriveAt, readyAt, leaveBy }) => ({
    personId,
    minutes: Math.max(
      0,
      minutesBetween(latest([window.start, canArriveAt ?? readyAt]), earliest([window.end, leaveBy ?? window.end])),
    ),
  }));
  const shortest = stays.reduce((least, stay) => (stay.minutes < least.minutes ? stay : least));
  return { key, placeId, togetherMinutes: Math.max(0, togetherMinutes), shortest };
}

type Walking = Pick<TravelProvider, 'walkingSeconds'>;

export const MINUTE_MS = 60 * 1000;

const plusMinutes = (at: Date, count: number): Date => new Date(at.getTime() + count * MINUTE_MS);

export const minutesBetween = (from: Date, to: Date): number => (to.getTime() - from.getTime()) / MINUTE_MS;

function minutes(from: string, to: string, travel: Walking): number {
  return from === to ? 0 : shownMinutes(travel.walkingSeconds(from, to));
}

export function originOf(person: GatheringPerson, { start, previous }: FreeInterval, now: Date): PersonPart['origin'] {
  if (person.chosenPlaceId !== undefined) {
    return { placeId: person.chosenPlaceId, basis: 'chosen' };
  }
  const placeId = previous?.placeId ?? null;
  const timetable = placeId === null ? null : { placeId, basis: 'timetable' as const };
  if (start > now) {
    return timetable;
  }
  if (person.locationPlaceId !== null) {
    return { placeId: person.locationPlaceId, basis: 'location' };
  }
  return previous !== null && minutesBetween(previous.end, now) <= RECENT_CLASS_MINUTES ? timetable : null;
}

function sideOf(person: GatheringPerson, stretch: Interval, now: Date): GatheringSide {
  const around = aroundShared(person.free, stretch);
  const { start, next } = around;
  return {
    personId: person.id,
    readyAt: person.notBefore === undefined ? start : latest([start, person.notBefore]),
    origin: originOf(person, around, now),
    next: next === null ? null : { start: next.start, placeId: next.placeId },
    leaveBy: person.leaveBy,
  };
}

function nextOf(next: GatheringSide['next'], placeId: string, travel: Walking): PersonPart['next'] {
  if (next === null) {
    return null;
  }
  return { ...next, walkMinutes: next.placeId === null ? null : minutes(placeId, next.placeId, travel) };
}

function leaveByOf(next: PersonPart['next'], fixed: Date | undefined): Date | null {
  const own = next === null ? null : plusMinutes(next.start, -(next.walkMinutes ?? 0));
  if (own === null || fixed === undefined) {
    return own ?? fixed ?? null;
  }
  return earliest([own, fixed]);
}

type Meeting = NonNullable<GatheringFit['meeting']>;

// Friends whose way passes the asker's origin meet the asker there; never two Friends without the asker.
function meetingOf(
  placeId: string,
  asker: GatheringSide,
  friends: readonly GatheringSide[],
  travel: Walking,
): Meeting | null {
  const meetAt = asker.origin?.placeId;
  if (meetAt === undefined || meetAt === placeId) {
    return null;
  }
  const onwardMinutes = minutes(meetAt, placeId, travel);
  const merging = friends.filter(({ origin }) => {
    if (origin === null || origin.placeId === placeId) {
      return false;
    }
    const detour = minutes(origin.placeId, meetAt, travel) + onwardMinutes - minutes(origin.placeId, placeId, travel);
    return detour <= DETOUR_MINUTES;
  });
  if (merging.length === 0) {
    return null;
  }
  const at = latest([
    asker.readyAt,
    ...merging.map(({ readyAt, origin }) => plusMinutes(readyAt, minutes(origin?.placeId ?? meetAt, meetAt, travel))),
  ]);
  const personIds = [asker.personId, ...merging.map(({ personId }) => personId)];
  return { placeId: meetAt, at, personIds, onwardMinutes };
}

// Their way and the earliest they can arrive. When they set out follows from the start.
function partOf(
  side: GatheringSide,
  placeId: string,
  meeting: Meeting | null,
  travel: Walking,
): Omit<PersonPart, 'leaveAt'> {
  const next = nextOf(side.next, placeId, travel);
  const known = { ...side, next, leaveBy: leaveByOf(next, side.leaveBy) };
  if (side.origin === null) {
    return { ...known, walkMinutes: null, canArriveAt: null };
  }
  if (meeting === null || !meeting.personIds.includes(side.personId)) {
    const walkMinutes = minutes(side.origin.placeId, placeId, travel);
    return { ...known, walkMinutes, canArriveAt: plusMinutes(side.readyAt, walkMinutes) };
  }
  const walkMinutes = minutes(side.origin.placeId, meeting.placeId, travel) + meeting.onwardMinutes;
  return { ...known, walkMinutes, canArriveAt: plusMinutes(meeting.at, meeting.onwardMinutes) };
}

function settingOut(part: Omit<PersonPart, 'leaveAt'>, start: Date): PersonPart {
  return { ...part, leaveAt: part.walkMinutes === null ? null : plusMinutes(start, -part.walkMinutes) };
}

function fitAt(
  place: GatheringPlace,
  [asker, ...friends]: readonly [GatheringSide, ...GatheringSide[]],
  window: Interval,
  travel: Walking,
): GatheringFit {
  const earliestMeeting = meetingOf(place.placeId, asker, friends, travel);
  const arriving = [asker, ...friends].map((side) => partOf(side, place.placeId, earliestMeeting, travel));
  const start = latest([window.start, ...arriving.map((part) => part.canArriveAt ?? part.readyAt)]);
  const end = earliest([window.end, ...arriving.flatMap(({ leaveBy }) => (leaveBy === null ? [] : [leaveBy]))]);
  // Everyone sets out as late as still has them there at the start, so the meeting moves with the start.
  const parts = arriving.map((part) => settingOut(part, start));
  const meeting =
    earliestMeeting === null ? null : { ...earliestMeeting, at: plusMinutes(start, -earliestMeeting.onwardMinutes) };
  return { ...place, start, end, togetherMinutes: minutesBetween(start, end), meeting, parts };
}
