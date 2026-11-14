/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { SHORTEST_MEAL_SECONDS } from '../../travel/judgement-constants.js';
import { shownMinutes, type TravelProvider } from '../../travel/travel.js';
import { type FreeInterval } from '../free-time/free-time.js';
import { aroundShared, earliest, type Interval, sharedTime } from '../free-time/meal-fit.js';

export interface GatheringMember {
  id: string;
  // Their Free Time that day, as freeTimeOf gives it.
  free: readonly FreeInterval[];
  // The Place of the position the asker may use for them now, or null.
  locationPlaceId: string | null;
}

export interface GatheringPlace {
  key: string;
  placeId: string;
}

export type OriginBasis = 'timetable' | 'location';

export interface MemberPart {
  memberId: string;
  readyAt: Date;
  origin: { placeId: string; basis: OriginBasis } | null;
  // Their whole way, to the merging point and on to the place. Null when the origin is unknown.
  walkMinutes: number | null;
  // The earliest they can be at the place. Null when the origin is unknown.
  arriveAt: Date | null;
  // When they set out. Null when the origin is unknown.
  leaveAt: Date | null;
  // When they must leave the place. Null when nothing follows.
  leaveBy: Date | null;
  next: { start: Date; placeId: string | null } | null;
}

export interface GatheringFit {
  key: string;
  placeId: string;
  start: Date;
  end: Date;
  togetherMinutes: number;
  // The merging point, with the asker first among memberIds, and the minutes they walk on from it together.
  meeting: { placeId: string; at: Date; memberIds: string[]; onwardMinutes: number } | null;
  // In the order of the members.
  parts: MemberPart[];
}

export interface GatheringDrop {
  key: string;
  placeId: string;
  // Never below 0.
  togetherMinutes: number;
  // Who could stay the shortest on their own, and for how long (never below 0). The first such member on a tie.
  shortest: { memberId: string; minutes: number };
}

export interface Gathering {
  // The stretch the plan lies in, or null when the people share none in the window.
  shared: Interval | null;
  fits: GatheringFit[];
  dropped: GatheringDrop[];
}

// A member free now without a location is still at the Place of an item that ended at most this long ago.
export const RECENT_CLASS_MINUTES = 15;

// The most a Friend's way may grow by going through the asker's origin to meet there.
export const DETOUR_MINUTES = 1;

// The asker is the first member. `now` is a whole minute.
export function gather(
  members: readonly [GatheringMember, ...GatheringMember[]],
  places: readonly GatheringPlace[],
  when: { window: Interval; now: Date },
  travel: Pick<TravelProvider, 'walkingSeconds'>,
): Gathering {
  const stretches = sharedTime(
    members.map(({ free }) => free),
    when.window,
  );
  const plans = stretches.map((stretch) => planIn(stretch, members, places, when, travel));
  return plans.find(({ fits }) => fits.length > 0) ?? plans[0] ?? { shared: null, fits: [], dropped: [] };
}

function planIn(
  stretch: Interval,
  [asker, ...friends]: readonly [GatheringMember, ...GatheringMember[]],
  places: readonly GatheringPlace[],
  { window, now }: { window: Interval; now: Date },
  travel: Walking,
): Gathering {
  const sides: [Side, ...Side[]] = [
    sideOf(asker, stretch, now),
    ...friends.map((friend) => sideOf(friend, stretch, now)),
  ];
  const all = places.map((place) => fitAt(place, sides, window, travel));
  const fits = all.filter((fit) => fitsTogether(fit)).toSorted(byLongestTogether);
  const dropped = all.filter((fit) => !fitsTogether(fit)).map((fit) => dropOf(fit, window));
  return { shared: stretch, fits, dropped };
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
  const stays = parts.map(({ memberId, arriveAt, readyAt, leaveBy }) => ({
    memberId,
    minutes: Math.max(
      0,
      minutesBetween(latest([window.start, arriveAt ?? readyAt]), earliest([window.end, leaveBy ?? window.end])),
    ),
  }));
  const shortest = stays.reduce((least, stay) => (stay.minutes < least.minutes ? stay : least));
  return { key, placeId, togetherMinutes: Math.max(0, togetherMinutes), shortest };
}

type Walking = Pick<TravelProvider, 'walkingSeconds'>;

interface Side {
  memberId: string;
  readyAt: Date;
  origin: MemberPart['origin'];
  next: MemberPart['next'];
}

const MINUTE_MS = 60 * 1000;

const plusMinutes = (at: Date, count: number): Date => new Date(at.getTime() + count * MINUTE_MS);

const minutesBetween = (from: Date, to: Date): number => (to.getTime() - from.getTime()) / MINUTE_MS;

function minutes(from: string, to: string, travel: Walking): number {
  return from === to ? 0 : shownMinutes(travel.walkingSeconds(from, to));
}

function originOf(member: GatheringMember, { start, previous }: FreeInterval, now: Date): MemberPart['origin'] {
  const placeId = previous?.placeId ?? null;
  const timetable = placeId === null ? null : { placeId, basis: 'timetable' as const };
  if (start > now) {
    return timetable;
  }
  if (member.locationPlaceId !== null) {
    return { placeId: member.locationPlaceId, basis: 'location' };
  }
  return previous !== null && minutesBetween(previous.end, now) <= RECENT_CLASS_MINUTES ? timetable : null;
}

function sideOf(member: GatheringMember, stretch: Interval, now: Date): Side {
  const around = aroundShared(member.free, stretch);
  const { start, next } = around;
  return {
    memberId: member.id,
    readyAt: start,
    origin: originOf(member, around, now),
    next: next === null ? null : { start: next.start, placeId: next.placeId },
  };
}

function leaveByOf(next: Side['next'], placeId: string, travel: Walking): Date | null {
  if (next === null) {
    return null;
  }
  return next.placeId === null ? next.start : plusMinutes(next.start, -minutes(placeId, next.placeId, travel));
}

type Meeting = NonNullable<GatheringFit['meeting']>;

// Friends whose way passes the asker's origin meet the asker there; never two Friends without the asker.
function meetingOf(placeId: string, asker: Side, friends: readonly Side[], travel: Walking): Meeting | null {
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
  const memberIds = [asker.memberId, ...merging.map(({ memberId }) => memberId)];
  return { placeId: meetAt, at, memberIds, onwardMinutes };
}

// Their way and the earliest they can arrive. When they set out follows from the start.
function partOf(side: Side, placeId: string, meeting: Meeting | null, travel: Walking): Omit<MemberPart, 'leaveAt'> {
  const leaveBy = leaveByOf(side.next, placeId, travel);
  if (side.origin === null) {
    return { ...side, walkMinutes: null, arriveAt: null, leaveBy };
  }
  if (meeting === null || !meeting.memberIds.includes(side.memberId)) {
    const walkMinutes = minutes(side.origin.placeId, placeId, travel);
    return { ...side, walkMinutes, arriveAt: plusMinutes(side.readyAt, walkMinutes), leaveBy };
  }
  const walkMinutes = minutes(side.origin.placeId, meeting.placeId, travel) + meeting.onwardMinutes;
  return { ...side, walkMinutes, arriveAt: plusMinutes(meeting.at, meeting.onwardMinutes), leaveBy };
}

function settingOut(part: Omit<MemberPart, 'leaveAt'>, start: Date): MemberPart {
  return { ...part, leaveAt: part.walkMinutes === null ? null : plusMinutes(start, -part.walkMinutes) };
}

function fitAt(
  place: GatheringPlace,
  [asker, ...friends]: readonly [Side, ...Side[]],
  window: Interval,
  travel: Walking,
): GatheringFit {
  const earliestMeeting = meetingOf(place.placeId, asker, friends, travel);
  const arriving = [asker, ...friends].map((side) => partOf(side, place.placeId, earliestMeeting, travel));
  const start = latest([window.start, ...arriving.map((part) => part.arriveAt ?? part.readyAt)]);
  const end = earliest([window.end, ...arriving.flatMap(({ leaveBy }) => (leaveBy === null ? [] : [leaveBy]))]);
  // Everyone sets out as late as still has them there at the start, so the meeting moves with the start.
  const parts = arriving.map((part) => settingOut(part, start));
  const meeting =
    earliestMeeting === null ? null : { ...earliestMeeting, at: plusMinutes(start, -earliestMeeting.onwardMinutes) };
  return { ...place, start, end, togetherMinutes: minutesBetween(start, end), meeting, parts };
}

const latest = (times: readonly Date[]): Date => new Date(Math.max(...times.map((time) => time.getTime())));
