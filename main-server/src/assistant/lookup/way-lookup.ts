/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  type AnswerLine,
  type ConditionChip,
  type Lookup,
  type LookupAction,
  type MapScene,
  type TimeBand,
} from '../dto/answer.dto.js';
import { clockOf } from '../free-time/free-time.js';
import { withTopic } from '../gathering/answer-words.js';
import { busyIn, halfHoursAround } from '../gathering/meal-scene.js';
import { PlaceNaming } from '../gathering/place-naming.js';
import { koreaTime } from '../korea-time.js';
import { type Way, type WayArgs, wayOf } from './way.js';

export { type WayArgs } from './way.js';

// The words of a way, and what the map draws of it. Only the labels are sent to the model.

export type WayAnswer =
  // How the start and the Place are called.
  | { result: 'found'; way: Way; lookup: Lookup; labels: { from: string; to: string } }
  | { result: 'none'; reason: 'no-start' | 'no-next' };

// The leave-by notification of a way taken alone is sent only for a walk this long or longer.
const REMIND_WALK_MINUTES = 5;

const GATE = '정문';
const GATE_BASIS = '지금 위치는 캠퍼스 밖이라 쓰지 않고 정문부터 쟀어요';

const part = (text: string, strong = false): AnswerLine[number] => ({ text, strong });

class WayNaming extends PlaceNaming {
  constructor(private readonly args: WayArgs) {
    super(args.placeOf);
  }

  from({ start }: Way): string {
    return start.basis === 'gate' ? GATE : this.placeLabel(start.placeId);
  }

  // The Place gone to, by its name and number when it has both, since the User may have asked by either; the Place of
  // their next item as their Timetable calls it.
  to({ toPlaceId, next }: Way): { name: string; label: string } {
    const { number, name } = this.args.placeOf(toPlaceId);
    if (next !== null || number === null) {
      return { name, label: this.placeLabel(toPlaceId) };
    }
    return { name, label: `${name}(${number}동)` };
  }
}

type Deadline = NonNullable<Way['deadline']>;

const gated = ({ start }: Way): boolean => start.basis === 'gate';

// "13:00 수업" for a Class, else the clock time.
const dueWords = ({ at, isClass }: Deadline): string => (isClass ? `${clockOf(at)} 수업` : clockOf(at));

function chipsOf(way: Way, naming: WayNaming): ConditionChip[] {
  const origin: ConditionChip = { kind: 'origin', text: `${naming.from(way)}에서`, userId: null };
  const { deadline } = way;
  return deadline === null ? [origin] : [origin, { kind: 'until', text: `${dueWords(deadline)}까지`, userId: null }];
}

function linesOf(way: Way, naming: WayNaming): AnswerLine[] {
  const { start, walkMinutes, deadline, arrival } = way;
  const to = naming.to(way);
  if (deadline === null) {
    const from = naming.from(way);
    // The particle follows the name, outside the parentheses.
    const particle = withTopic(to.name).slice(to.name.length);
    return [
      [part(to.label, true), part(`${particle} 여기예요`)],
      [part(`${start.basis === 'location' ? `지금 있는 ${from}` : from}에서 걸어서 ${walkMinutes}분`)],
    ];
  }
  const leaveBy = clockOf(deadline.leaveBy);
  if (deadline.lateMinutes > 0) {
    const going = gated(way) ? '지금 정문을 지나도 ' : '지금 가도 ';
    return [[part(going), part(clockOf(arrival), true), part(' 도착')], [part(`${deadline.lateMinutes}분 늦어요`)]];
  }
  if (gated(way)) {
    return [[part('정문을 '), part(leaveBy, true), part('까지 지나면')], [part(`${dueWords(deadline)}에 맞아요`)]];
  }
  return [
    [part(`${to.label}까지 걸어서 `), part(`${walkMinutes}분`, true)],
    [part(leaveBy, true), part(`에 나서면 ${clockOf(deadline.at)}에 맞아요`)],
  ];
}

function basisOf(way: Way, naming: WayNaming): string[] {
  const { walkMinutes, deadline, now } = way;
  const walk = `${naming.from(way)} → ${naming.to(way).label} 걸어서 ${walkMinutes}분`;
  let lines = [`${walk} · 앱의 도보표`];
  if (deadline !== null) {
    lines = deadline.lateMinutes > 0 ? [`걸어서 ${walkMinutes}분 · 지금 ${clockOf(now)}`] : [walk];
  }
  return gated(way) ? [...lines, GATE_BASIS] : lines;
}

// One flag: the minutes at the Place without a deadline, the arrival there when late, else when to set out at the
// start.
function flagOf(way: Way, naming: WayNaming): MapScene['flags'][number] {
  const { start, toPlaceId, walkMinutes, deadline, arrival } = way;
  const to = naming.position(toPlaceId);
  if (deadline === null) {
    return { at: to, text: `${naming.to(way).label} · 걸어서 ${walkMinutes}분`, role: 'place' };
  }
  if (deadline.lateMinutes > 0) {
    return { at: to, text: `${clockOf(arrival)} 도착 · ${deadline.lateMinutes}분 늦어요`, role: 'place' };
  }
  const leaveBy = clockOf(deadline.leaveBy);
  const text = gated(way) ? `${leaveBy}까지 정문 통과` : `${leaveBy} 나서기`;
  return { at: naming.position(start.placeId), text, role: 'place' };
}

function sceneOf(way: Way, args: WayArgs, naming: WayNaming): MapScene {
  const { start, toPlaceId, walkMinutes, next } = way;
  const { me, location } = args;
  const here = start.basis === 'location' ? (location?.at ?? null) : null;
  const { label } = naming.to(way);
  const place = naming.labelledPoint(toPlaceId, label);
  const from = naming.position(start.placeId);
  const to = naming.position(toPlaceId);
  return {
    people: [
      {
        userId: me.userId,
        name: me.name,
        me: true,
        at: here ?? from,
        source: here === null ? 'timetable' : 'exact',
        tag: '나',
      },
    ],
    places: [
      next === null
        ? { place, role: 'pick', tag: label }
        : { place, role: 'next', tag: `${clockOf(next.start)}${next.isClass ? ' 수업' : ''} · ${label}` },
    ],
    routes: walkMinutes > 0 ? [{ userId: me.userId, role: 'me', from, to, minutes: walkMinutes }] : [],
    flags: [flagOf(way, naming)],
  };
}

// From the half hour at or before the earlier of now and the leave-by time, to the half hour at or after the later of
// the deadline and the arrival. The stretch runs from setting out to the deadline, or from now to the arrival when late.
function bandOf(way: Way, args: WayArgs, naming: WayNaming): TimeBand | null {
  const { deadline, now, arrival, walkMinutes } = way;
  if (deadline === null) {
    return null;
  }
  const late = deadline.lateMinutes > 0;
  const { from, until } = halfHoursAround(
    Math.min(now.getTime(), deadline.leaveBy.getTime()),
    Math.max(deadline.at.getTime(), arrival.getTime()),
  );
  const [startAt, endAt] = late ? [now, arrival] : [deadline.leaveBy, deadline.at];
  return {
    range: { startAt: koreaTime(from), endAt: koreaTime(until) },
    now: koreaTime(now),
    lanes: [{ userId: args.me.userId, name: '나', busy: busyIn(args.me.items, from, until) }],
    startAt: koreaTime(startAt),
    endAt: koreaTime(endAt),
    text: `${late ? `${clockOf(now)}–${clockOf(arrival)}` : flagOf(way, naming).text} · 걸어서 ${walkMinutes}분`,
  };
}

// Route guidance, after a leave-by notification while the leave-by time is ahead and the walk is long enough.
function actionsOf(way: Way, naming: WayNaming): LookupAction[] {
  const { toPlaceId, walkMinutes, deadline, now } = way;
  const { label } = naming.to(way);
  const guide: LookupAction = { kind: 'guide', to: naming.labelledPoint(toPlaceId, label) };
  if (deadline === null || deadline.leaveBy <= now || walkMinutes < REMIND_WALK_MINUTES) {
    return [guide];
  }
  const going = gated(way) ? '지금 정문을 지나면' : '지금 나서면';
  const text = `${going} ${dueWords(deadline)}에 맞아요 · ${label}까지 걸어서 ${walkMinutes}분`;
  return [{ kind: 'remind', at: koreaTime(deadline.leaveBy), text }, guide];
}

export function wayAnswer(args: WayArgs): WayAnswer {
  const way = wayOf(args);
  if (way === 'no-start' || way === 'no-next') {
    return { result: 'none', reason: way };
  }
  const naming = new WayNaming(args);
  const lookup: Lookup = {
    kind: 'way',
    chips: chipsOf(way, naming),
    lines: linesOf(way, naming),
    basis: basisOf(way, naming),
    scene: sceneOf(way, args, naming),
    band: bandOf(way, args, naming),
    actions: actionsOf(way, naming),
  };
  return { result: 'found', way, lookup, labels: { from: naming.from(way), to: naming.to(way).label } };
}
