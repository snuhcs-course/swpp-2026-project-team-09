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
import { withCopula, withTopic } from '../gathering/answer-words.js';
import { MINUTE_MS } from '../gathering/gathering.js';
import { busyIn, halfHoursAround } from '../gathering/meal-scene.js';
import { koreaTime } from '../korea-time.js';
import {
  NOT_RUNNING,
  shuttleActions,
  shuttleBand,
  shuttleBasis,
  shuttleLine,
  shuttleLines,
  shuttleScene,
  type ShuttleTaken,
} from './shuttle-lookup.js';
import { atPlace, type Way, type WayArgs, wayOf } from './way.js';
import { dueWords, gated, part, REMIND_WALK_MINUTES, WayNaming } from './way-naming.js';

export { type WayArgs } from './way.js';

// The words of a way, and what the map draws of it: the walk, or the shuttle when it is taken. Only the labels are
// sent to the model.

export type WayAnswer =
  // How the start and the Place are called.
  | { result: 'found'; way: Way; lookup: Lookup; labels: { from: string; to: string } }
  | { result: 'none'; reason: 'no-start' | 'no-next' | 'past-by' };

export const GATE_BASIS = '지금 위치는 캠퍼스 밖이라 쓰지 않고 정문부터 쟀어요';
// Board n14's, where the lines say it was counted from the gate.
const GATE_UNUSED = '지금 위치는 캠퍼스 밖이라 쓰지 않았어요';
const OFF_CAMPUS_NOTE = '캠퍼스 밖이라 친구에게 내 위치가 보이지 않아요';

const takenShuttle = ({ shuttle }: Way): ShuttleTaken | null =>
  shuttle !== null && shuttle !== 'not running' && shuttle.taken ? shuttle : null;

// Board n14: a walk from the gate that is in time for the deadline.
const gateInTime = (way: Way): boolean =>
  gated(way) && takenShuttle(way) === null && way.deadline !== null && way.deadline.lateMinutes === 0;

function chipsOf(way: Way, naming: WayNaming): ConditionChip[] {
  const origin: ConditionChip = { kind: 'origin', text: `${naming.from(way)}에서`, userId: null };
  const { deadline } = way;
  return deadline === null ? [origin] : [origin, { kind: 'until', text: `${dueWords(deadline)}까지`, userId: null }];
}

type Called = ReturnType<WayNaming['to']>;

// The particle after a Place's label follows the name outside the parentheses of "name(N동)", else the label.
function particleAfter({ name, label }: Called, withParticle: (word: string) => string): string {
  const word = label.startsWith(name) ? name : label;
  return withParticle(word).slice(word.length);
}

function linesOf(way: Way, naming: WayNaming): AnswerLine[] {
  const shuttle = takenShuttle(way);
  if (shuttle !== null) {
    return shuttleLines(way, shuttle);
  }
  const { start, walkMinutes, deadline, arrival } = way;
  const to = naming.to(way);
  if (deadline === null) {
    const from = naming.from(way);
    return [
      [part(to.label, true), part(`${particleAfter(to, withTopic)} 여기예요`)],
      [part(`${start.basis === 'location' ? `지금 있는 ${from}` : from}에서 걸어서 ${walkMinutes}분`)],
    ];
  }
  const leaveBy = clockOf(deadline.leaveBy);
  if (deadline.lateMinutes > 0) {
    const going = gated(way) ? '지금 정문을 지나도 ' : '지금 가도 ';
    return [[part(going), part(clockOf(arrival), true), part(' 도착')], [part(`${deadline.lateMinutes}분 늦어요`)]];
  }
  if (gated(way)) {
    return [
      [part('정문을 '), part(leaveBy, true), part('까지 지나면 돼요')],
      [part('캠퍼스 밖이라 정문부터 계산했어요')],
    ];
  }
  return [
    [part(`${to.label}까지 걸어서 `), part(`${walkMinutes}분`, true)],
    [part(leaveBy, true), part(`에 나서면 ${clockOf(deadline.at)}에 맞아요`)],
  ];
}

// A walk's, with the shuttle's minutes when it is 15 minutes or more.
function basisOf(way: Way, naming: WayNaming): string[] {
  const shuttle = takenShuttle(way);
  const { walkMinutes, deadline, now } = way;
  const walk = `${naming.from(way)} → ${naming.to(way).label} 걸어서 ${walkMinutes}분`;
  let lines = [`${walk} · 앱의 도보표`];
  if (deadline !== null) {
    lines = deadline.lateMinutes > 0 ? [`걸어서 ${walkMinutes}분 · 지금 ${clockOf(now)}`] : [walk];
  }
  const compared = shuttleLine(way);
  if (shuttle !== null) {
    lines = shuttleBasis(way, shuttle);
  } else if (compared !== null) {
    lines = [...lines, compared];
  }
  if (!gated(way)) {
    return lines;
  }
  return [...lines, gateInTime(way) ? GATE_UNUSED : GATE_BASIS];
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
    return { at: to, text: `${clockOf(arrival)} 도착 · ${deadline.lateMinutes}분 늦어요`, role: 'late' };
  }
  const leaveBy = clockOf(deadline.leaveBy);
  const text = gated(way) ? `${leaveBy}까지` : `${leaveBy} 나서기`;
  return { at: naming.position(start.placeId), text, role: 'leave' };
}

// The Place gone to, picked out, or as the User's next item.
function placeOf(way: Way, naming: WayNaming): MapScene['places'][number] {
  const { toPlaceId, next } = way;
  const { label } = naming.to(way);
  const point = naming.labelledPoint(toPlaceId, label);
  return next === null
    ? { place: point, role: 'pick', tag: label }
    : { place: point, role: 'next', tag: `${clockOf(next.start)}${next.isClass ? ' 수업' : ''} · ${label}` };
}

function sceneOf(way: Way, naming: WayNaming): MapScene {
  const { start, toPlaceId, walkMinutes } = way;
  const place = placeOf(way, naming);
  const shuttle = takenShuttle(way);
  if (shuttle !== null) {
    return shuttleScene(way, shuttle, naming, place);
  }
  const me = naming.me(way);
  const from = naming.position(start.placeId);
  const to = naming.position(toPlaceId);
  return {
    people: [me],
    places: [place],
    routes: walkMinutes > 0 ? [{ userId: me.userId, role: 'me', from, to, minutes: walkMinutes }] : [],
    flags: [flagOf(way, naming)],
  };
}

// From the half hour at or before the earlier of now and the leave-by time, to the half hour at or after the later of
// the deadline and the arrival. The stretch runs from setting out to the deadline, or from now to the arrival when late.
function bandOf(way: Way, args: WayArgs, naming: WayNaming): TimeBand | null {
  const { deadline, now, arrival, walkMinutes } = way;
  const shuttle = takenShuttle(way);
  if (shuttle !== null) {
    return shuttleBand(way, shuttle, { userId: args.me.userId, items: args.me.items });
  }
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

// Route guidance, after a leave-by notification while the leave-by time is ahead and the walk is long enough. From
// off campus in time, nothing but closing: the way starts at the gate, not where the User is.
function actionsOf(way: Way, naming: WayNaming): LookupAction[] {
  const { toPlaceId, walkMinutes, deadline, now } = way;
  const { label } = naming.to(way);
  const guide: LookupAction = { kind: 'guide', to: naming.labelledPoint(toPlaceId, label) };
  const shuttle = takenShuttle(way);
  if (shuttle !== null) {
    return shuttleActions(way, shuttle, naming, guide);
  }
  if (gateInTime(way)) {
    return [];
  }
  if (deadline === null || deadline.leaveBy <= now || walkMinutes < REMIND_WALK_MINUTES) {
    return [guide];
  }
  const text = `지금 나서면 ${dueWords(deadline)}에 맞아요 · ${label}까지 걸어서 ${walkMinutes}분`;
  return [{ kind: 'remind', at: koreaTime(deadline.leaveBy), text }, guide];
}

// What says where the User is; off campus, the gate's line.
const HERE_BASIS: Record<Way['start']['basis'], (to: Called) => string> = {
  location: (to) => `지금 있는 곳이 ${to.label}${particleAfter(to, withCopula)}`,
  timetable: ({ label }) => `오늘 마지막으로 끝난 일정이 ${label}에서였어요`,
  chosen: (to) => `나서는 곳이 ${to.label}${particleAfter(to, withCopula)}`,
  gate: () => GATE_BASIS,
};

export const hereBasis = (way: Way, naming: WayNaming): string => HERE_BASIS[way.start.basis](naming.to(way));

// The User at the Place already: the minutes left until the deadline, or that the Place is here. No way, no time to
// set out, and no button.
function hereLookup(way: Way, naming: WayNaming): Lookup {
  const { deadline, now } = way;
  const to = naming.to(way);
  const where = hereBasis(way, naming);
  const left =
    deadline === null ? null : `${dueWords(deadline)}까지 ${(deadline.at.getTime() - now.getTime()) / MINUTE_MS}분`;
  return {
    kind: 'way',
    chips: chipsOf(way, naming),
    lines:
      left === null
        ? [
            [part(to.label, true), part(`${particleAfter(to, withTopic)} 여기예요`)],
            [part(`지금 ${to.label}에 있어요`)],
          ]
        : [[part('지금 '), part(to.label, true), part('에 있어요')], [part(`${left} 남았어요`)]],
    basis: left === null ? [where] : [where, `지금 ${clockOf(now)} · ${left}`],
    scene: { people: [naming.me(way)], places: [placeOf(way, naming)], routes: [], flags: [] },
    band: null,
    actions: [],
  };
}

// Asked about the shuttle while it is not running and nothing is due (board n21): that it is not, in the words of the
// basis, the walk, its arrival, and no button.
function notRunning(lookup: Lookup, way: Way, naming: WayNaming): Lookup {
  const { toPlaceId, walkMinutes, arrival } = way;
  const flag = { at: naming.position(toPlaceId), text: `${clockOf(arrival)} 도착 · ${naming.placeLabel(toPlaceId)}` };
  return {
    ...lookup,
    lines: [
      [part(NOT_RUNNING)],
      [part(`${naming.to(way).label}까지 걸어서 `), part(`${walkMinutes}분`, true), part('이에요')],
    ],
    scene: { ...lookup.scene, flags: [{ ...flag, role: 'place' }] },
    actions: [],
  };
}

export function wayAnswer(args: WayArgs): WayAnswer {
  const way = wayOf(args);
  if (typeof way === 'string') {
    return { result: 'none', reason: way };
  }
  const naming = new WayNaming(args);
  const lookup: Lookup = atPlace(way)
    ? hereLookup(way, naming)
    : {
        kind: 'way',
        chips: chipsOf(way, naming),
        lines: linesOf(way, naming),
        basis: basisOf(way, naming),
        scene: sceneOf(way, naming),
        band: bandOf(way, args, naming),
        actions: actionsOf(way, naming),
      };
  const asked = args.about === 'shuttle' && way.shuttle === 'not running' && way.deadline === null;
  const shown = asked ? notRunning(lookup, way, naming) : lookup;
  return {
    result: 'found',
    way,
    lookup: gated(way) ? { ...shown, note: OFF_CAMPUS_NOTE } : shown,
    labels: { from: naming.from(way), to: naming.to(way).label },
  };
}
