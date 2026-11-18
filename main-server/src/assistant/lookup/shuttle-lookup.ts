/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { shownMinutes } from '../../travel/travel.js';
import { SHUTTLE_ADVANTAGE_SECONDS } from '../../travel/judgement-constants.js';
import { type AnswerLine, type LookupAction, type MapScene, type TimeBand } from '../dto/answer.dto.js';
import { clockOf, type DayItem } from '../free-time/free-time.js';
import { MINUTE_MS } from '../gathering/gathering.js';
import { busyIn, halfHoursAround } from '../gathering/meal-scene.js';
import { koreaTime } from '../korea-time.js';
import { type ShuttleTrip } from './shuttle-trip.js';
import { type Way } from './way.js';
import { dueWords, gated, part, REMIND_WALK_MINUTES, type WayNaming } from './way-naming.js';

// The words and the map of a way that takes the shuttle, and the line of a walk's basis that weighs it.

export type ShuttleTaken = Extract<Way['shuttle'], { trip: ShuttleTrip }>;

export const takenShuttle = ({ shuttle }: Pick<Way, 'shuttle'>): ShuttleTaken | null =>
  shuttle !== null && shuttle !== 'not running' && shuttle.taken ? shuttle : null;

// A walk this long or longer names the shuttle in its basis.
const COMPARED_WALK_MINUTES = 15;

const ADVANTAGE_MINUTES = SHUTTLE_ADVANTAGE_SECONDS / 60;

const RULE = `셔틀은 걷기보다 ${ADVANTAGE_MINUTES}분 이상 빠를 때만 권해요 (평일 8–21시)`;

export const NOT_RUNNING = '셔틀은 지금 다니지 않아요 (평일 8–21시)';

const minutesBetween = (from: Date, to: Date): number => (to.getTime() - from.getTime()) / MINUTE_MS;

const tripMinutes = ({ leave, arrival }: ShuttleTrip): number => minutesBetween(leave, arrival);

// The shuttle's minutes when a walk of 15 minutes or more is taken; null for a shorter walk.
export function shuttleLine({ walkMinutes, shuttle, now }: Way): string | null {
  if (walkMinutes < COMPARED_WALK_MINUTES || shuttle === null) {
    return null;
  }
  if (shuttle === 'not running') {
    return NOT_RUNNING;
  }
  const { toStopMinutes, rideMinutes, fromStopMinutes, arrival } = shuttle.trip;
  const riding = toStopMinutes + rideMinutes + fromStopMinutes;
  if (riding + ADVANTAGE_MINUTES > walkMinutes) {
    const legs = `정류장 ${toStopMinutes} · 타기 ${rideMinutes} · 내려서 ${fromStopMinutes}`;
    return `셔틀은 기다림 없이도 ${riding}분(${legs})이라 걸어요`;
  }
  const minutes = minutesBetween(now, arrival);
  return minutes >= walkMinutes
    ? `셔틀은 ${minutes}분 걸려 걸어요`
    : `셔틀은 ${minutes}분으로 걷기보다 ${ADVANTAGE_MINUTES}분 이상 빠르지 않아 걸어요`;
}

// A pressed Place's card: the ride and the arrival, then the stop and when to set out for it.
export function shuttleFacts({ trip }: ShuttleTaken, naming: WayNaming): [string, string] {
  const { label } = naming.stopPoint(trip.stops[0]?.name ?? '');
  return [
    `셔틀로 ${tripMinutes(trip)}분 · ${clockOf(trip.arrival)} 도착`,
    trip.passed === null
      ? `${label}에서 타요 · 기다림 약 ${trip.waitMinutes}분`
      : `${clockOf(trip.leave)}에 나서 ${label}에서 ${clockOf(trip.comes)} 셔틀`,
  ];
}

// Route guidance on foot to the stop the shuttle is taken at, since the app's guidance is a walk.
export function boardingGuide({ trip }: ShuttleTaken, naming: WayNaming): LookupAction {
  return { kind: 'guide', to: naming.stopPoint(trip.stops[0]?.name ?? '') };
}

export function shuttleLines(way: Way, { trip, lateMinutes }: ShuttleTaken): AnswerLine[] {
  const faster = [part('셔틀', true), part(`이 ${minutesBetween(trip.arrival, way.arrival)}분 빨라요`)];
  if (way.deadline === null) {
    return [faster, [part(`셔틀로 ${tripMinutes(trip)}분이에요`)]];
  }
  const leave = clockOf(trip.leave);
  const arriving = `${clockOf(trip.arrival)} 도착${lateMinutes > 0 ? `, ${lateMinutes}분 늦어요` : ''}`;
  return [
    faster,
    gated(way)
      ? [part('정문을 '), part(leave, true), part(`에 지나면 ${arriving}`)]
      : [part(leave, true), part(`에 나서면 ${arriving}`)],
  ];
}

export function shuttleBasis(way: Way, { trip }: ShuttleTaken): string[] {
  const { toStopMinutes, rideMinutes, fromStopMinutes, comes, passed, waitMinutes, leave } = trip;
  const late = way.deadline !== null && way.deadline.lateMinutes > 0 ? `, ${way.deadline.lateMinutes}분 늦어요` : '';
  return [
    passed === null
      ? `지금 나서 정류장까지 ${toStopMinutes}분 · 오는 셔틀이 안 잡혀 기다림은 이 시간대 평균 ${waitMinutes}분`
      : `${clockOf(leave)}에 나서 정류장까지 ${toStopMinutes}분 · ${clockOf(comes)} 셔틀, 약 ${minutesBetween(way.now, comes)}분 뒤`,
    `타는 시간 ${rideMinutes}분 · 내려서 걷기 ${fromStopMinutes}분 · 모두 ${tripMinutes(trip)}분`,
    `지금 걸어 나서면 ${way.walkMinutes}분 · ${clockOf(way.arrival)} 도착${late}`,
    RULE,
  ];
}

// The arrival at the Place, late or not, by its time when there is a deadline.
function arrivalFlag(way: Way, { trip, lateMinutes }: ShuttleTaken, naming: WayNaming): MapScene['flags'][number] {
  const at = naming.position(way.toPlaceId);
  if (way.deadline === null) {
    return { at, text: `${naming.to(way).label} · 셔틀로 ${tripMinutes(trip)}분`, role: 'place' };
  }
  const arrival = `${clockOf(trip.arrival)} 도착`;
  return lateMinutes > 0
    ? { at, text: `${arrival} · ${lateMinutes}분 늦어요`, role: 'late' }
    : { at, text: arrival, role: 'place' };
}

// The walk faded as the way not taken, the walk to the stop, the ride stretch by stretch along the loop, and the walk
// from the stop; the two stops beside the Place; the stop the shuttle passed last, and the arrival.
export function shuttleScene(
  way: Way,
  shuttle: ShuttleTaken,
  naming: WayNaming,
  place: MapScene['places'][number],
): MapScene {
  const { start, toPlaceId, walkMinutes } = way;
  const { stops, toStopMinutes, fromStopMinutes, comes, passed, waitMinutes } = shuttle.trip;
  const me = naming.me(way);
  const from = naming.position(start.placeId);
  const to = naming.position(toPlaceId);
  const [boardingStop, alightingStop] = [stops[0]?.name ?? '', stops.at(-1)?.name ?? ''];
  const boarding = naming.stopPoint(boardingStop);
  const alighting = naming.stopPoint(alightingStop);
  const stretches = stops.slice(1).map((stop, index): MapScene['routes'][number] => ({
    userId: me.userId,
    role: 'shuttle',
    from: naming.stopPosition(stops[index]?.name ?? ''),
    to: naming.stopPosition(stop.name),
    minutes: Math.max(0, shownMinutes(stop.rideSeconds) - shownMinutes(stops[index]?.rideSeconds ?? 0)),
  }));
  return {
    people: [me],
    places: [
      {
        place: boarding,
        role: 'stop',
        tag: `${boarding.label} · ${passed === null ? `기다림 약 ${waitMinutes}분` : `${clockOf(comes)} 셔틀`}`,
      },
      { place: alighting, role: 'stop', tag: alighting.label },
      place,
    ],
    routes: [
      { userId: me.userId, role: 'alt', from, to, minutes: walkMinutes },
      { userId: me.userId, role: 'me', from, to: naming.stopPosition(boardingStop), minutes: toStopMinutes },
      ...stretches,
      { userId: me.userId, role: 'me', from: naming.stopPosition(alightingStop), to, minutes: fromStopMinutes },
    ],
    flags: [
      ...(passed === null
        ? []
        : [{ at: naming.stopPosition(passed), text: `셔틀 · ${passed} 지남`, role: 'shuttle' as const }]),
      arrivalFlag(way, shuttle, naming),
    ],
  };
}

// From the half hour at or before now to the half hour at or after the later of the deadline and the arrival. The
// stretch runs from setting out to the arrival.
export function shuttleBand(
  way: Way,
  { trip, lateMinutes }: ShuttleTaken,
  lane: { userId: string; items: readonly DayItem[] },
): TimeBand | null {
  const { deadline, now } = way;
  if (deadline === null) {
    return null;
  }
  const { from, until } = halfHoursAround(now.getTime(), Math.max(deadline.at.getTime(), trip.arrival.getTime()));
  const leave = clockOf(trip.leave);
  return {
    range: { startAt: koreaTime(from), endAt: koreaTime(until) },
    now: koreaTime(now),
    lanes: [{ userId: lane.userId, name: '나', busy: busyIn(lane.items, from, until) }],
    startAt: koreaTime(trip.leave),
    endAt: koreaTime(trip.arrival),
    text: `${lateMinutes > 0 ? `${leave}–${clockOf(trip.arrival)}` : `${leave} 나서기`} · 셔틀로 ${tripMinutes(trip)}분`,
  };
}

// A notification in time for the shuttle, while that is still ahead and it makes the deadline, then route guidance to
// the stop.
export function shuttleActions(way: Way, shuttle: ShuttleTaken, naming: WayNaming): LookupAction[] {
  const { trip, lateMinutes } = shuttle;
  const guide = boardingGuide(shuttle, naming);
  const { deadline, now } = way;
  if (deadline === null || lateMinutes > 0 || trip.leave <= now || tripMinutes(trip) < REMIND_WALK_MINUTES) {
    return [guide];
  }
  const going = gated(way) ? '지금 정문을 지나면' : '지금 나서면';
  const boarding = naming.stopPoint(trip.stops[0]?.name ?? '').label;
  const text = `${going} ${clockOf(trip.comes)} 셔틀로 ${dueWords(deadline)}에 맞아요 · ${boarding}까지 걸어서 ${trip.toStopMinutes}분`;
  return [{ kind: 'remind', at: koreaTime(trip.leave), text }, guide];
}
