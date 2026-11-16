/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Position } from '../../common/geometry.js';
import { shownMinutes } from '../../travel/travel.js';
import { type AnswerLine, type Lookup, type MapScene, type PlacePoint } from '../dto/answer.dto.js';
import { clockOf } from '../free-time/free-time.js';
import { MINUTE_MS } from '../gathering/gathering.js';
import { nextIn } from './tutorial-lookup.js';
import { type Span, stayStart } from './tutorial-order.js';
import { type Next } from './tutorial-words.js';
import { atPlace, type Way, type WayArgs } from './way.js';
import { GATE_BASIS, wayAnswer } from './way-lookup.js';
import { gated, part, WayNaming } from './way-naming.js';

// The way to a Tutorial Quest's place and back (board q12): the shuttle weighed against the walk, the stay there, and
// the walk on to the User's next item, with whether they are back in time.

export interface QuestStop {
  title: string;
  placeId: string;
  // The Place's name and floor, or a point's label: "NH농협두레문예관 2층".
  words: string;
  at: Position;
  stayMinutes: number;
  // When it is open that day, in order; null when nothing says.
  open: readonly Span[] | null;
  // The content's line of when it can be done.
  note: string | null;
}

// What the model is given; the lines and the map stay with the app.
export interface QuestWayWords {
  quest: string;
  place: string;
  by: 'shuttle' | 'walk' | 'there already';
  arrival: string;
  // When the User is there for the stay, or null when it is not open again that day.
  stay: { from: string; until: string; waitsForOpening: boolean } | null;
  next: {
    due: string;
    place: string | null;
    walkMinutes: number | null;
    backAt: string | null;
    lateMinutes: number;
  } | null;
  note: string | null;
}

export type QuestWayAnswer =
  { result: 'found'; way: Way; lookup: Lookup; words: QuestWayWords } | { result: 'none'; reason: 'no-start' };

interface Visit {
  way: Way;
  stop: QuestStop;
  // By the shuttle when it is taken.
  arrival: Date;
  byShuttle: boolean;
  start: Date | null;
  end: Date | null;
  next: Next | null;
  onwardMinutes: number | null;
  back: Date | null;
  lateMinutes: number;
}

const plus = (at: Date, minutes: number): Date => new Date(at.getTime() + minutes * MINUTE_MS);

const minutesBetween = (from: Date, to: Date): number => (to.getTime() - from.getTime()) / MINUTE_MS;

function visitOf(way: Way, stop: QuestStop, args: WayArgs, naming: WayNaming): Visit {
  const shuttle = way.shuttle !== null && way.shuttle !== 'not running' && way.shuttle.taken ? way.shuttle : null;
  const arrival = shuttle?.trip.arrival ?? way.arrival;
  const start = stayStart(stop, arrival);
  const end = start === null ? null : plus(start, stop.stayMinutes);
  const next = nextIn(args.me.items, way.now, naming);
  const nextPlaceId = next?.placeId ?? null;
  let onward: number | null = null;
  if (nextPlaceId !== null) {
    onward = nextPlaceId === stop.placeId ? 0 : shownMinutes(args.travel.walkingSeconds(stop.placeId, nextPlaceId));
  }
  const back = end === null ? null : plus(end, onward ?? 0);
  const lateMinutes = next === null || back === null ? 0 : Math.max(0, minutesBetween(next.item.start, back));
  return {
    way,
    stop,
    arrival,
    byShuttle: shuttle !== null,
    start,
    end,
    next,
    onwardMinutes: onward,
    back,
    lateMinutes,
  };
}

// "오늘은 열지 않아요" on a day without hours, else when it closes.
function closedWords(open: readonly Span[] | null): string {
  const last = open?.at(-1);
  return last === undefined ? '오늘은 열지 않아요' : `오늘은 ${clockOf(last.until)}에 닫아요`;
}

function linesOf(visit: Visit): AnswerLine[] {
  const { way, stop, arrival, byShuttle, start, end, next, lateMinutes } = visit;
  const first: AnswerLine = atPlace(way)
    ? [part('지금 '), part(stop.words, true), part('에 있어요')]
    : [part(byShuttle ? '셔틀로 가면 ' : '걸어서 가면 '), part(clockOf(arrival), true), part(' 도착')];
  if (start === null || end === null) {
    return [first, [part(closedWords(stop.open))]];
  }
  if (next === null) {
    return [first, [part(`${stop.stayMinutes}분 머물면 `), part(clockOf(end), true), part('에 끝나요')]];
  }
  return lateMinutes > 0
    ? [first, [part('다녀오면 '), part(next.due, true), part(`에 ${lateMinutes}분 늦어요`)]]
    : [first, [part(`${next.due} 전`, true), part('에 다녀올 수 있어요')]];
}

// The shuttle's legs and the walk it beats, else the way's own basis.
function wayBasis({ way, byShuttle }: Visit, base: Lookup): string[] {
  const { shuttle } = way;
  if (!byShuttle || shuttle === null || shuttle === 'not running') {
    return base.basis;
  }
  const { toStopMinutes, rideMinutes, fromStopMinutes, comes, passed, waitMinutes, arrival } = shuttle.trip;
  const waiting = passed === null ? `기다림 약 ${waitMinutes}분` : `${clockOf(comes)} 셔틀`;
  const lines = [
    `셔틀: 정류장까지 ${toStopMinutes}분 · ${waiting} · 타기 ${rideMinutes}분 · 내려서 ${fromStopMinutes}분`,
    `걸으면 ${way.walkMinutes}분 · ${clockOf(way.arrival)} 도착이라 셔틀이 ${minutesBetween(arrival, way.arrival)}분 빨라요`,
  ];
  return gated(way) ? [...lines, GATE_BASIS] : lines;
}

// The stay, waiting for the place to open, and the walk on to the next item.
function stayBasis({ arrival, start, end, next, onwardMinutes, back, stop }: Visit): string[] {
  if (start === null || end === null || back === null) {
    return [];
  }
  const waits = start > arrival ? [`${clockOf(start)}에 열어 ${minutesBetween(arrival, start)}분 기다려요`] : [];
  const label = next?.label ?? null;
  const onward =
    label === null || onwardMinutes === null
      ? `${clockOf(end)}에 끝나요`
      : `${label}까지 걸어서 ${onwardMinutes}분 · ${clockOf(back)} 도착`;
  return [...waits, `거기서 ${stop.stayMinutes}분 · ${onward}`];
}

function sceneOf(visit: Visit, base: Lookup, args: WayArgs, pick: PlacePoint): MapScene {
  const naming = new WayNaming(args);
  const { stop, arrival, next, onwardMinutes, lateMinutes, way } = visit;
  const { scene } = base;
  const nextPlace =
    next === null || next.placeId === null || next.label === null || next.placeId === stop.placeId
      ? []
      : [
          {
            place: naming.labelledPoint(next.placeId, next.label),
            role: 'next' as const,
            tag: `${next.due} · ${next.label}`,
          },
        ];
  const nextPlaceId = next?.placeId ?? null;
  const onward =
    nextPlace.length === 0 || nextPlaceId === null || onwardMinutes === null || onwardMinutes === 0
      ? []
      : [
          {
            userId: args.me.userId,
            role: 'next' as const,
            from: naming.position(stop.placeId),
            to: naming.position(nextPlaceId),
            minutes: onwardMinutes,
          },
        ];
  const arrived = atPlace(way)
    ? []
    : [
        {
          at: stop.at,
          text: `${clockOf(arrival)} 도착 · ${stop.words}`,
          role: lateMinutes > 0 ? 'late' : 'place',
        } as const,
      ];
  return {
    people: scene.people,
    places: [
      ...scene.places.filter(({ place }) => place.placeId !== stop.placeId),
      { place: pick, role: 'pick', tag: stop.words },
      ...nextPlace,
    ],
    routes: [...scene.routes, ...onward],
    // The plain way's arrival, and its time to set out when the next item is at the quest's Place, give way to the
    // quest's own arrival and lines.
    flags: [...scene.flags.filter(({ role }) => role === 'shuttle'), ...arrived],
  };
}

function wordsOf(visit: Visit): QuestWayWords {
  const { way, stop, arrival, byShuttle, start, end, next, onwardMinutes, back, lateMinutes } = visit;
  const moving = byShuttle ? 'shuttle' : 'walk';
  return {
    quest: stop.title,
    place: stop.words,
    by: atPlace(way) ? 'there already' : moving,
    arrival: clockOf(arrival),
    stay:
      start === null || end === null
        ? null
        : { from: clockOf(start), until: clockOf(end), waitsForOpening: start > arrival },
    next:
      next === null
        ? null
        : {
            due: next.due,
            place: next.label,
            walkMinutes: onwardMinutes,
            backAt: back === null ? null : clockOf(back),
            lateMinutes,
          },
    note: stop.note,
  };
}

export function questWay(args: WayArgs, stop: QuestStop): QuestWayAnswer {
  const answer = wayAnswer({ ...args, toPlaceId: stop.placeId, by: null });
  if (answer.result === 'none') {
    return { result: 'none', reason: 'no-start' };
  }
  const { way, lookup: base } = answer;
  const naming = new WayNaming(args);
  const visit = visitOf(way, stop, args, naming);
  const pick: PlacePoint = { placeId: stop.placeId, label: stop.words, ...stop.at };
  const { next } = visit;
  const lookup: Lookup = {
    kind: 'way',
    chips:
      next === null
        ? base.chips.filter(({ kind }) => kind === 'origin')
        : [
            ...base.chips.filter(({ kind }) => kind === 'origin'),
            { kind: 'until', text: `${next.due}까지`, userId: null },
          ],
    lines: linesOf(visit),
    basis: [...wayBasis(visit, base), ...stayBasis(visit), ...(stop.note === null ? [] : [stop.note])],
    scene: sceneOf(visit, base, args, pick),
    band: null,
    actions: atPlace(way) ? [] : [{ kind: 'guide', to: pick }],
  };
  return { result: 'found', way, lookup, words: wordsOf(visit) };
}
