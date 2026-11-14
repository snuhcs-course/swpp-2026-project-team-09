/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerLine, type MapScene, type PlacePoint } from '../assistant/dto/answer.dto.js';
import { clockOf, type DayItem, freeTimeOf } from '../assistant/free-time/free-time.js';
import { itemAt, withAnd } from '../assistant/gathering/answer-words.js';
import { DETOUR_MINUTES, gather, MINUTE_MS } from '../assistant/gathering/gathering.js';
import { koreaDate, koreaTime } from '../assistant/korea-time.js';
import { type Position } from '../common/geometry.js';
import { type PlaceDto } from '../places/dto/place.dto.js';
import { shownMinutes, type TravelProvider } from '../travel/travel.js';
import { type OwnWay } from './dto/invitation-card.dto.js';

// The invitee's own way to a Quest's gathering, worked out from the Quest's steps, their own day, and their own
// location by the gathering calculation's rules. It knows nothing of the database.

type Walking = Pick<TravelProvider, 'walkingSeconds'>;

export interface CardStep {
  id: string;
  title: string;
  start: Date | null;
  end: Date | null;
  // A Place of the list, or null.
  placeId: string | null;
  // As the Quest's own `ended` says at now.
  ended: boolean;
}

export type TimedStep = CardStep & { start: Date; placeId: string };

export interface Gathered {
  destination: TimedStep;
  meeting: TimedStep | null;
}

export interface OwnWayArgs {
  gathered: Gathered;
  invitee: { id: string; name: string };
  leaderName: string;
  // The invitee's items of the gathering's day.
  items: readonly DayItem[];
  // Where the phone is now; its Place is null when the position is in none.
  location: { position: Position; placeId: string | null; onCampus: boolean } | null;
  // A whole minute.
  now: Date;
  travel: Walking;
  placeOf: (placeId: string) => PlaceDto;
}

const plusMinutes = (at: Date, count: number): Date => new Date(at.getTime() + count * MINUTE_MS);

function minutes(from: string, to: string, travel: Walking): number {
  return from === to ? 0 : shownMinutes(travel.walkingSeconds(from, to));
}

const isTimed = (step: CardStep): step is TimedStep => step.start !== null && step.placeId !== null;

// What making a Quest from a Plan writes for a meeting: it ends where the next step starts, and its start plus the walk
// to the next step's Place is that start.
function isMeetingStep(step: TimedStep, next: TimedStep, travel: Walking): boolean {
  const nextStart = next.start.getTime();
  return (
    step.end?.getTime() === nextStart &&
    plusMinutes(step.start, minutes(step.placeId, next.placeId, travel)).getTime() === nextStart
  );
}

// The first step ahead with a start and a Place of the list, or the step after it when it is a meeting step.
export function gatheringOf(steps: readonly CardStep[], travel: Walking): Gathered | null {
  const [first, second] = steps
    .filter((step) => !step.ended)
    .filter((step) => isTimed(step))
    .toSorted((a, b) => a.start.getTime() - b.start.getTime());
  if (first === undefined) {
    return null;
  }
  if (second !== undefined && isMeetingStep(first, second, travel)) {
    return { destination: second, meeting: first };
  }
  return { destination: first, meeting: null };
}

export function placeLabel({ number, name }: PlaceDto): string {
  return number === null ? name : `${number}동`;
}

export function placePoint(placeId: string, placeOf: (placeId: string) => PlaceDto): PlacePoint {
  const place = placeOf(placeId);
  return { placeId, label: placeLabel(place), latitude: place.latitude, longitude: place.longitude };
}

interface Leg {
  from: string;
  to: string;
  minutes: number;
}

interface Way {
  status: OwnWay['status'];
  origin: { placeId: string; basis: 'timetable' | 'location' } | null;
  leaveAt: Date | null;
  arriveAt: Date | null;
  legs: Leg[];
  // Their Merging Point, when they take it.
  meeting: TimedStep | null;
  next: { start: Date; placeId: string | null; isClass: boolean } | null;
  leaveBy: Date | null;
}

const NO_WAY = { origin: null, leaveAt: null, arriveAt: null, legs: [], meeting: null };

type Going = Pick<Way, 'leaveAt' | 'arriveAt' | 'legs' | 'meeting'>;

// Through the Merging Point when it lies on their way and they can be there by its start; straight otherwise, as late
// as still has them there at the start, or as soon as they are ready.
function goingFrom(from: string, readyAt: Date, { destination, meeting }: Gathered, travel: Walking): Going {
  const straight = minutes(from, destination.placeId, travel);
  if (meeting !== null && from !== meeting.placeId && from !== destination.placeId) {
    const toMeeting = minutes(from, meeting.placeId, travel);
    const onward = minutes(meeting.placeId, destination.placeId, travel);
    const onTheWay = toMeeting + onward - straight <= DETOUR_MINUTES;
    if (onTheWay && plusMinutes(readyAt, toMeeting) <= meeting.start) {
      return {
        leaveAt: plusMinutes(meeting.start, -toMeeting),
        arriveAt: plusMinutes(meeting.start, onward),
        legs: [
          { from, to: meeting.placeId, minutes: toMeeting },
          { from: meeting.placeId, to: destination.placeId, minutes: onward },
        ],
        meeting,
      };
    }
  }
  const canArriveAt = plusMinutes(readyAt, straight);
  const late = canArriveAt > destination.start;
  return {
    leaveAt: late ? readyAt : plusMinutes(destination.start, -straight),
    arriveAt: late ? canArriveAt : destination.start,
    legs: [{ from, to: destination.placeId, minutes: straight }],
    meeting: null,
  };
}

function wayOf({ gathered, invitee, items, location, now, travel }: OwnWayArgs): Way {
  const { destination } = gathered;
  const window = { start: destination.start, end: destination.end ?? plusMinutes(destination.start, 1) };
  const person = {
    id: invitee.id,
    free: freeTimeOf(items, koreaDate(destination.start), now),
    locationPlaceId: location?.onCampus === true ? location.placeId : null,
  };
  const place = { key: destination.id, placeId: destination.placeId };
  const { shared, sides } = gather([person], [place], { window, now }, travel);
  const side = sides[0];
  if (shared === null || side === undefined) {
    return { status: 'busy', ...NO_WAY, next: null, leaveBy: null };
  }
  const next = side.next === null ? null : { ...side.next, isClass: itemAt(items, side.next)?.isClass === true };
  const leaveBy =
    next === null
      ? null
      : plusMinutes(next.start, next.placeId === null ? 0 : -minutes(destination.placeId, next.placeId, travel));
  if (side.origin === null) {
    const status = location !== null && !location.onCampus ? 'off-campus' : 'unknown';
    return { status, ...NO_WAY, next, leaveBy };
  }
  const { placeId, basis } = side.origin;
  return {
    status: 'ok',
    origin: { placeId, basis: basis === 'location' ? 'location' : 'timetable' },
    ...goingFrom(placeId, side.readyAt, gathered, travel),
    next,
    leaveBy,
  };
}

const plain = (text: string): AnswerLine => [{ text, strong: false }];

function wayLine({ status, leaveAt, arriveAt, legs }: Way, walkMinutes: number, args: OwnWayArgs): AnswerLine | null {
  if (status === 'busy') {
    return plain('그 시간에는 다른 일정이 있어요.');
  }
  if (status === 'off-campus') {
    return plain('캠퍼스 밖이라 길은 그리지 못해요.');
  }
  if (leaveAt === null || arriveAt === null || legs.length === 0) {
    return null;
  }
  const walked = walkMinutes > 0 ? [{ text: ` 걸어서 ${walkMinutes}분.`, strong: false }] : [];
  if (arriveAt > args.gathered.destination.start) {
    return [{ text: `${clockOf(arriveAt)}에야 도착해요.`, strong: true }, ...walked];
  }
  if (walkMinutes === 0) {
    return plain('같은 건물이라 걷지 않아도 돼요.');
  }
  const classEnds = args.items.some(({ isClass, end }) => isClass && end.getTime() === leaveAt.getTime());
  const setOut = classEnds
    ? `${clockOf(leaveAt)}에 수업이 끝나면 바로 나서면 돼요.`
    : `${clockOf(leaveAt)}에 나서면 돼요.`;
  return [{ text: setOut, strong: true }, ...walked];
}

function linesOf(way: Way, walkMinutes: number, args: OwnWayArgs): AnswerLine[] {
  const lines: AnswerLine[] = [];
  const first = wayLine(way, walkMinutes, args);
  if (first !== null) {
    lines.push(first);
  }
  if (way.next !== null && way.leaveBy !== null) {
    const what = way.next.isClass ? '수업' : '일정';
    lines.push(plain(`${clockOf(way.next.start)} ${what}이라 ${clockOf(way.leaveBy)}엔 나서요.`));
  }
  return lines;
}

function positionOf(placeId: string, placeOf: (placeId: string) => PlaceDto): Position {
  const { latitude, longitude } = placeOf(placeId);
  return { latitude, longitude };
}

// The invitee alone, at their exact position when their way starts from it.
function scenePeople(
  { origin }: Way,
  walkMinutes: number,
  { invitee, location, placeOf }: OwnWayArgs,
): MapScene['people'] {
  if (origin === null) {
    return [];
  }
  const exact = origin.basis === 'location' ? (location?.position ?? null) : null;
  return [
    {
      userId: invitee.id,
      name: invitee.name,
      me: true,
      at: exact ?? positionOf(origin.placeId, placeOf),
      source: exact === null ? 'timetable' : 'exact',
      tag: walkMinutes > 0 ? `나 · ${walkMinutes}분` : '나',
    },
  ];
}

function sceneOf(way: Way, walkMinutes: number, args: OwnWayArgs): MapScene {
  const { gathered, invitee, leaderName, placeOf } = args;
  const { destination } = gathered;
  const at = (placeId: string): Position => positionOf(placeId, placeOf);
  const places: MapScene['places'] = [{ place: placePoint(destination.placeId, placeOf), role: 'pick', tag: null }];
  const routes: MapScene['routes'] = way.legs.map((leg) => ({
    userId: invitee.id,
    role: 'me',
    from: at(leg.from),
    to: at(leg.to),
    minutes: leg.minutes,
  }));
  const flags: MapScene['flags'] = [
    { at: at(destination.placeId), text: `${clockOf(destination.start)} ${destination.title}`, role: 'place' },
  ];
  const { next, meeting } = way;
  if (next !== null && next.placeId !== null) {
    const point = placePoint(next.placeId, placeOf);
    const clock = next.isClass ? `${clockOf(next.start)} 수업` : clockOf(next.start);
    places.push({ place: point, role: 'next', tag: `${clock} · ${point.label}` });
    routes.push({
      userId: invitee.id,
      role: 'next',
      from: at(destination.placeId),
      to: at(next.placeId),
      minutes: minutes(destination.placeId, next.placeId, args.travel),
    });
  }
  if (meeting !== null) {
    places.push({ place: placePoint(meeting.placeId, placeOf), role: 'meeting', tag: null });
    flags.push({
      at: at(meeting.placeId),
      text: `${clockOf(meeting.start)} ${withAnd(leaderName)} 만남`,
      role: 'meeting',
    });
  }
  return {
    people: scenePeople(way, walkMinutes, args),
    places,
    routes: routes.filter((route) => route.minutes > 0),
    flags,
  };
}

const timeOrNull = (at: Date | null): string | null => (at === null ? null : koreaTime(at));

export function ownWay(args: OwnWayArgs): OwnWay {
  const way = wayOf(args);
  const { placeOf } = args;
  const walkMinutes = way.legs.reduce((total, leg) => total + leg.minutes, 0);
  return {
    status: way.status,
    origin: way.origin === null ? null : { place: placePoint(way.origin.placeId, placeOf), basis: way.origin.basis },
    leaveAt: timeOrNull(way.leaveAt),
    walkMinutes: way.origin === null ? null : walkMinutes,
    arriveAt: timeOrNull(way.arriveAt),
    meeting:
      way.meeting === null
        ? null
        : { place: placePoint(way.meeting.placeId, placeOf), at: koreaTime(way.meeting.start) },
    leaveBy: timeOrNull(way.leaveBy),
    next:
      way.next === null
        ? null
        : {
            startAt: koreaTime(way.next.start),
            place: way.next.placeId === null ? null : placePoint(way.next.placeId, placeOf),
          },
    lines: linesOf(way, walkMinutes, args),
    scene: sceneOf(way, walkMinutes, args),
  };
}
