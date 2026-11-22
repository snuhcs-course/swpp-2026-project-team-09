/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { SHORTEST_MEAL_SECONDS } from '../../travel/judgement-constants.js';
import { type FreeInterval } from '../free-time/free-time.js';
import { aroundShared, earliest, type Interval, latest, sharedTime } from '../free-time/meal-fit.js';
import {
  type GatheringTravel,
  type Leg,
  legOf,
  nextOf,
  ON_FOOT,
  settledShuttle,
  walkingMinutes as minutes,
} from './gathering-travel.js';
import { PLAN_ORDERS, type PlanOrder } from './plan-order.js';

export { type GatheringTravel, onFoot, type ShuttleStops } from './gathering-travel.js';

export interface GatheringPerson {
  id: string;
  // Their Free Time that day, as freeTimeOf gives it.
  free: readonly FreeInterval[];
  // The Place of the position the asker may use for them now, or null.
  locationPlaceId: string | null;
  // The asker's app sent no location and said why: they set out from their previous item's Place at any time.
  locationMissing?: boolean;
  // What the asker fixed for them: where they set out from, the earliest they are ready, and the latest they leave.
  chosenPlaceId?: string;
  notBefore?: Date;
  leaveBy?: Date;
}

export interface GatheringPlace {
  key: string;
  placeId: string;
  // A Restaurant's own window, from the hours its page gave, in place of the gathering's; and when it closes.
  window?: Interval;
  closesAt?: Date;
}

export type OriginBasis = 'timetable' | 'location' | 'chosen';

export interface PersonPart {
  personId: string;
  readyAt: Date;
  // `assumed`: taken from the Timetable because the location was missing.
  origin: { placeId: string; basis: OriginBasis; assumed?: true } | null;
  // The minutes of their whole way, to the merging point and on to the place, on foot or by the shuttle as `by` says.
  // Null when the origin is unknown.
  walkMinutes: number | null;
  by: Leg['by'];
  // The stops of a way by the shuttle, else null.
  shuttle: Leg['shuttle'];
  // The earliest they can be at the place. Null when the origin is unknown.
  canArriveAt: Date | null;
  // When they set out to be there at the start. Null when the origin is unknown.
  leaveAt: Date | null;
  // When they must leave the place. Null when nothing follows.
  leaveBy: Date | null;
  // The way from the place to the next item's Place, its minutes null when it has none.
  next: ({ start: Date; placeId: string | null; walkMinutes: number | null } & Pick<Leg, 'by' | 'shuttle'>) | null;
}

// A person's side of the stretch the plan lies in.
export interface GatheringSide {
  personId: string;
  readyAt: Date;
  origin: PersonPart['origin'];
  // The stretch starts after now: they set out from the item before it, not from where they are.
  later: boolean;
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
  // The Restaurant's own window it was fitted in, when its hours gave one.
  window?: Interval;
}

// A plan's minutes are said only up to two hours, a stay a person can act on. A longer one is said by its end, or
// "식사 210분" reads as a meal three and a half hours long and "함께 780분" as nothing at all.
export const MINUTES_SAID_MAX = 120;

export function endedByItem({ end, parts }: Pick<GatheringFit, 'end' | 'parts'>): boolean {
  return parts.some(({ leaveBy }) => leaveBy !== null && leaveBy.getTime() === end.getTime());
}

export function minutesSaid({ togetherMinutes }: Pick<GatheringFit, 'togetherMinutes'>): boolean {
  return togetherMinutes <= MINUTES_SAID_MAX;
}

export interface GatheringDrop {
  key: string;
  placeId: string;
  // Never below 0.
  togetherMinutes: number;
  // Who could stay the shortest on their own, and for how long (never below 0). The first such person on a tie.
  shortest: { personId: string; minutes: number };
  // In the order of the people.
  parts: PersonPart[];
  // The Restaurant closes before a meal fits: when, and the asker's walk there.
  closing?: { at: Date; walkMinutes: number | null };
  // The Restaurant's own window, when its hours gave one.
  window?: Interval;
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

// The Places, or those of a stretch from its sides, as a meet adds the buildings the people set out from.
export type GatheringPlaces =
  readonly GatheringPlace[] | ((sides: readonly GatheringSide[]) => readonly GatheringPlace[]);

// The asker is the first person. `now` is a whole minute. Without `merging`, everyone walks to the place on their own,
// as for a meet, where meeting on the way would be the meet itself. With `startsBy`, only a stretch that starts by then
// is planned: when none fits, the first stretch's sides come back with nothing fitted. The plans are a meal's, the
// least travel first, unless `order` says otherwise.
export function gather(
  people: readonly [GatheringPerson, ...GatheringPerson[]],
  places: GatheringPlaces,
  when: { window: Interval; now: Date },
  travel: GatheringTravel,
  { merging = true, startsBy, order = 'walking' }: { merging?: boolean; startsBy?: Date; order?: PlanOrder } = {},
): Gathering {
  const stretches = sharedTime(
    people.map(({ free }) => free),
    when.window,
  );
  const plans = stretches.map((stretch) => planIn(stretch, people, places, when, { travel, merging, order }));
  const held =
    startsBy === undefined ? plans : plans.filter(({ shared }) => shared !== null && shared.start <= startsBy);
  const first = plans[0] ?? { shared: null, sides: [], fits: [], dropped: [] };
  return (
    held.find(({ fits }) => fits.length > 0) ??
    (startsBy === undefined ? first : { ...first, fits: [], dropped: held[0]?.dropped ?? [] })
  );
}

function planIn(
  stretch: Interval,
  [asker, ...friends]: readonly [GatheringPerson, ...GatheringPerson[]],
  places: GatheringPlaces,
  { window, now }: { window: Interval; now: Date },
  { travel, merging, order }: { travel: Walking; merging: boolean; order: PlanOrder },
): Gathering {
  const sides: [GatheringSide, ...GatheringSide[]] = [
    sideOf(asker, stretch, now),
    ...friends.map((friend) => sideOf(friend, stretch, now)),
  ];
  const candidates = typeof places === 'function' ? places(sides) : places;
  const all = candidates.map((place) => ({ place, fit: fitAt(place, sides, window, { travel, merging }) }));
  const fits = all.flatMap(({ fit }) => (fitsTogether(fit) ? [fit] : [])).toSorted(PLAN_ORDERS[order]);
  const dropped = all.flatMap(({ place, fit }) => (fitsTogether(fit) ? [] : [dropOf(fit, place, window)]));
  return { shared: stretch, sides, fits, dropped };
}

const fitsTogether = ({ togetherMinutes }: GatheringFit): boolean => togetherMinutes >= SHORTEST_MEAL_SECONDS / 60;

function dropOf(fit: GatheringFit, place: GatheringPlace, gatheringWindow: Interval): GatheringDrop {
  const { key, placeId, togetherMinutes, end, parts, window: own } = fit;
  const window = own ?? gatheringWindow;
  const stays = parts.map(({ personId, canArriveAt, readyAt, leaveBy }) => ({
    personId,
    minutes: Math.max(
      0,
      minutesBetween(latest([window.start, canArriveAt ?? readyAt]), earliest([window.end, leaveBy ?? window.end])),
    ),
  }));
  const shortest = stays.reduce((least, stay) => (stay.minutes < least.minutes ? stay : least));
  const drop = {
    key,
    placeId,
    togetherMinutes: Math.max(0, togetherMinutes),
    shortest,
    parts,
    ...(own === undefined ? {} : { window: own }),
  };
  const { closesAt } = place;
  return closesAt === undefined || end.getTime() !== closesAt.getTime()
    ? drop
    : { ...drop, closing: { at: closesAt, walkMinutes: parts[0]?.walkMinutes ?? null } };
}

type Walking = GatheringTravel;

export const MINUTE_MS = 60 * 1000;

const plusMinutes = (at: Date, count: number): Date => new Date(at.getTime() + count * MINUTE_MS);

export const minutesBetween = (from: Date, to: Date): number => (to.getTime() - from.getTime()) / MINUTE_MS;

// Where a person sets out from for a stretch of Free Time: what the asker chose, else the Place of the item that keeps
// them until then, else the Place of their location, else, when their location is said to be missing, that of the
// previous item however long ago it ended, else that of an item that ended at most RECENT_CLASS_MINUTES ago.
export function originOf(
  person: Pick<GatheringPerson, 'chosenPlaceId' | 'locationPlaceId' | 'locationMissing'>,
  { start, previous }: Pick<FreeInterval, 'start' | 'previous'>,
  now: Date,
): PersonPart['origin'] {
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
  if (person.locationMissing === true) {
    return timetable === null ? null : { ...timetable, assumed: true };
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
    later: start > now,
    next: next === null ? null : { start: next.start, placeId: next.placeId },
    leaveBy: person.leaveBy,
  };
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
    return { ...known, walkMinutes: null, ...ON_FOOT, canArriveAt: null };
  }
  if (meeting === null || !meeting.personIds.includes(side.personId)) {
    const { minutes: walkMinutes, by, shuttle } = legOf(side.origin.placeId, placeId, travel, side.readyAt);
    return { ...known, walkMinutes, by, shuttle, canArriveAt: plusMinutes(side.readyAt, walkMinutes) };
  }
  // Meeting on the way is on foot.
  const walkMinutes = minutes(side.origin.placeId, meeting.placeId, travel) + meeting.onwardMinutes;
  return { ...known, walkMinutes, ...ON_FOOT, canArriveAt: plusMinutes(meeting.at, meeting.onwardMinutes) };
}

function settingOut(part: Omit<PersonPart, 'leaveAt'>, start: Date): PersonPart {
  return { ...part, leaveAt: part.walkMinutes === null ? null : plusMinutes(start, -part.walkMinutes) };
}

function fitAt(
  { key, placeId, window: own }: GatheringPlace,
  [asker, ...friends]: readonly [GatheringSide, ...GatheringSide[]],
  gatheringWindow: Interval,
  { travel, merging }: { travel: Walking; merging: boolean },
): GatheringFit {
  const place = { key, placeId };
  const window = own ?? gatheringWindow;
  const earliestMeeting = merging ? meetingOf(place.placeId, asker, friends, travel) : null;
  const weighed = [asker, ...friends].map((side) => partOf(side, place.placeId, earliestMeeting, travel));
  const first = latest([window.start, ...weighed.map((part) => part.canArriveAt ?? part.readyAt)]);
  const arriving = weighed.map((part) => settledShuttle(part, place.placeId, first, travel));
  const start = latest([window.start, ...arriving.map((part) => part.canArriveAt ?? part.readyAt)]);
  const end = earliest([window.end, ...arriving.flatMap(({ leaveBy }) => (leaveBy === null ? [] : [leaveBy]))]);
  // Everyone sets out as late as still has them there at the start, so the meeting moves with the start.
  const parts = arriving.map((part) => settingOut(part, start));
  const meeting =
    earliestMeeting === null ? null : { ...earliestMeeting, at: plusMinutes(start, -earliestMeeting.onwardMinutes) };
  const fit = { ...place, start, end, togetherMinutes: minutesBetween(start, end), meeting, parts };
  return own === undefined ? fit : { ...fit, window: own };
}
