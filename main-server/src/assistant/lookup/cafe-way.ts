/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Position } from '../../common/geometry.js';
import { shownMinutes } from '../../travel/travel.js';
import {
  type AnswerLine,
  type ConditionChip,
  type Lookup,
  type MapScene,
  type PlacePoint,
  type TimeBand,
} from '../dto/answer.dto.js';
import { clockOf } from '../free-time/free-time.js';
import { MINUTE_MS } from '../gathering/gathering.js';
import { busyIn, halfHoursAround } from '../gathering/meal-scene.js';
import { koreaTime } from '../korea-time.js';
import { type Way, type WayArgs, wayOf } from './way.js';
import { GATE_BASIS } from './way-lookup.js';
import { dueWords, gated, part, WayNaming } from './way-naming.js';

// A café on the way to the User's next item, or to a Place they name (board q9): each café's extra minutes on foot
// against going straight there, the one with the fewest picked, and the next two beside it.

export interface Cafe {
  name: string;
  // The seeded Place it is in or nearest to, which the walking table knows.
  placeId: string;
  at: Position;
}

export interface CafeWords {
  from: string;
  to: string;
  directMinutes: number;
  // The fewest extra minutes first; the first is the one drawn.
  cafes: { name: string; place: string; extraMinutes: number; arrival: string; until: string | null }[];
}

export type CafeAnswer =
  | { result: 'found'; way: Way; lookup: Lookup; words: CafeWords }
  | { result: 'none'; reason: 'no-start' | 'no-next' | 'no-cafe' | 'no-time' };

const SHOWN = 3;

const COUNT_WORDS = ['', '한', '두', '세'];

const DATA_BASIS = '카페는 OpenStreetMap에 올라 있는 곳만 찾아요';

interface Stop {
  cafe: Cafe;
  there: number;
  on: number;
  extra: number;
  arrival: Date;
  // When to set out from the café to be on time; null without a deadline.
  leaveBy: Date | null;
}

const plus = (at: Date, minutes: number): Date => new Date(at.getTime() + minutes * MINUTE_MS);

function stopsOf(way: Way, args: WayArgs, cafes: readonly Cafe[]): Stop[] {
  const walk = (from: string, to: string): number =>
    from === to ? 0 : shownMinutes(args.travel.walkingSeconds(from, to));
  return cafes
    .map((cafe): Stop => {
      const there = walk(way.start.placeId, cafe.placeId);
      const on = walk(cafe.placeId, way.toPlaceId);
      const leaveBy = way.deadline === null ? null : plus(way.deadline.at, -on);
      return { cafe, there, on, extra: there + on - way.walkMinutes, arrival: plus(way.now, there), leaveBy };
    })
    .filter(({ arrival, leaveBy }) => leaveBy === null || leaveBy > arrival)
    .toSorted(
      (one, other) => one.extra - other.extra || one.on - other.on || one.cafe.name.localeCompare(other.cafe.name),
    );
}

const extraWords = ({ extra }: Stop): string => (extra === 0 ? '가는 길에 있어요' : `돌아가는 길 +${extra}분`);

const tagOf = (stop: Stop): string => `${stop.cafe.name} · +${stop.extra}분`;

const pointOf = ({ name, placeId, at }: Cafe): PlacePoint => ({ placeId, label: name, ...at });

function chipsOf(way: Way, naming: WayNaming): ConditionChip[] {
  const { deadline } = way;
  return [
    { kind: 'origin', text: `${naming.from(way)}에서`, userId: null },
    ...(deadline === null ? [] : [{ kind: 'until' as const, text: `${dueWords(deadline)}까지`, userId: null }]),
    { kind: 'what', text: '카페', userId: null },
  ];
}

function linesOf(pick: Stop): AnswerLine[] {
  return [
    [part(pick.cafe.name, true), part('에 들러요')],
    [part(`${extraWords(pick)} · ${clockOf(pick.arrival)} 도착`)],
  ];
}

function basisOf(way: Way, shown: readonly Stop[], naming: WayNaming): string[] {
  const [pick] = shown;
  if (pick === undefined) {
    return [];
  }
  const to = naming.placeLabel(way.toPlaceId);
  const same = shown.filter(({ extra }) => extra === pick.extra).length;
  const lines = [`바로 가면 ${way.walkMinutes}분, 들르면 ${way.walkMinutes}분 + ${pick.extra}분`];
  if (same > 1) {
    lines.push(`${COUNT_WORDS[same] ?? same} 곳 다 +${pick.extra}분이라 ${to}에 가장 가까운 곳을 골랐어요`);
  }
  if (way.deadline !== null && pick.leaveBy !== null) {
    lines.push(`${clockOf(pick.leaveBy)}에 나서면 ${dueWords(way.deadline)}에 맞아요 · ${to}까지 걸어서 ${pick.on}분`);
  }
  lines.push(DATA_BASIS);
  return gated(way) ? [...lines, GATE_BASIS] : lines;
}

function sceneOf(way: Way, shown: readonly Stop[], naming: WayNaming): MapScene {
  const [pick, ...others] = shown;
  if (pick === undefined) {
    return { people: [], places: [], routes: [], flags: [] };
  }
  const me = naming.me(way);
  const cafe = pick.cafe.at;
  const { next } = way;
  const to = naming.placeLabel(way.toPlaceId);
  const until = pick.leaveBy === null ? '' : ` · ${clockOf(pick.leaveBy)}까지 있어요`;
  return {
    people: [me],
    places: [
      { place: pointOf(pick.cafe), role: 'pick', tag: tagOf(pick) },
      ...others.map((stop) => ({ place: pointOf(stop.cafe), role: 'candidate' as const, tag: tagOf(stop) })),
      {
        place: naming.labelledPoint(way.toPlaceId, to),
        role: 'next',
        tag: next === null ? to : `${clockOf(next.start)}${next.isClass ? ' 수업' : ''} · ${to}`,
      },
    ],
    routes: [
      ...(pick.there === 0
        ? []
        : [
            {
              userId: me.userId,
              role: 'me' as const,
              from: naming.position(way.start.placeId),
              to: cafe,
              minutes: pick.there,
            },
          ]),
      ...(pick.on === 0
        ? []
        : [
            {
              userId: me.userId,
              role: 'next' as const,
              from: cafe,
              to: naming.position(way.toPlaceId),
              minutes: pick.on,
            },
          ]),
    ],
    flags: [{ at: cafe, text: `${clockOf(pick.arrival)} 도착${until}`, role: 'place' }],
  };
}

// The stay at the café on the band, from the arrival to when to set out for the deadline.
function bandOf(way: Way, pick: Stop, args: WayArgs): TimeBand | null {
  const { deadline, now } = way;
  if (deadline === null || pick.leaveBy === null) {
    return null;
  }
  const { from, until } = halfHoursAround(now.getTime(), deadline.at.getTime());
  return {
    range: { startAt: koreaTime(from), endAt: koreaTime(until) },
    now: koreaTime(now),
    lanes: [{ userId: args.me.userId, name: '나', busy: busyIn(args.me.items, from, until) }],
    startAt: koreaTime(pick.arrival),
    endAt: koreaTime(pick.leaveBy),
    text: `${clockOf(pick.arrival)}–${clockOf(pick.leaveBy)} · 카페`,
  };
}

export function cafeWay(args: WayArgs, cafes: readonly Cafe[]): CafeAnswer {
  const way = wayOf(args);
  if (way === 'past-by') {
    return { result: 'none', reason: 'no-next' };
  }
  if (typeof way === 'string') {
    return { result: 'none', reason: way };
  }
  if (cafes.length === 0) {
    return { result: 'none', reason: 'no-cafe' };
  }
  const naming = new WayNaming(args);
  const shown = stopsOf(way, args, cafes).slice(0, SHOWN);
  const [pick] = shown;
  if (pick === undefined) {
    return { result: 'none', reason: 'no-time' };
  }
  const lookup: Lookup = {
    kind: 'way',
    chips: chipsOf(way, naming),
    lines: linesOf(pick),
    basis: basisOf(way, shown, naming),
    scene: sceneOf(way, shown, naming),
    band: bandOf(way, pick, args),
    actions: [{ kind: 'guide', to: pointOf(pick.cafe) }],
  };
  const words: CafeWords = {
    from: naming.from(way),
    to: naming.placeLabel(way.toPlaceId),
    directMinutes: way.walkMinutes,
    cafes: shown.map((stop) => ({
      name: stop.cafe.name,
      place: naming.placeLabel(stop.cafe.placeId),
      extraMinutes: stop.extra,
      arrival: clockOf(stop.arrival),
      until: stop.leaveBy === null ? null : clockOf(stop.leaveBy),
    })),
  };
  return { result: 'found', way, lookup, words };
}
