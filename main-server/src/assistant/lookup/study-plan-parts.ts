/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type StudyBuildingDto, type StudySpaceDto } from '../../study-spaces/dto/study-spaces.dto.js';
import { type Opening } from '../../study-spaces/study-hours.js';
import { shownMinutes } from '../../travel/travel.js';
import {
  type AnswerLine,
  type ConditionChip,
  type MapScene,
  type PlacePoint,
  type Plan,
  type PlanPart,
  type StudyInput,
  type StudySpot,
  type TimeBand,
} from '../dto/answer.dto.js';
import { clockOf } from '../free-time/free-time.js';
import { MINUTE_MS } from '../gathering/gathering.js';
import { busyIn, halfHoursAround } from '../gathering/meal-scene.js';
import { koreaTime } from '../korea-time.js';
import { durationWords } from './day-lookup.js';
import { pointOf, STUDY_WHATS } from './study-lookup.js';
import { type StudyDay, type StudyStay } from './study-near.js';
import { type WayArgs } from './way.js';
import { GATE_BASIS } from './way-lookup.js';
import { dueWords, WayNaming } from './way-naming.js';

// What each plan of a study answer says and draws (P10 ticket 03): its lines, basis, scene, time band and the asker's
// part, from the buildings ranked in `study-plan.ts`.

export interface StudyHours {
  opening: Opening;
  confidence: 'high' | 'medium' | 'low';
}

export interface Spot {
  space: StudySpaceDto;
  hours: StudyHours;
}

// What ends the stay: the walk on to the next item, the end the User set, the space's closing, or nothing known, when it
// is taken as three hours.
export type EndsBy = 'next' | 'until' | 'close' | 'guess';

export interface Ranked {
  building: StudyBuildingDto;
  // The spaces open or not known at the arrival, the one open longest first.
  spots: [Spot, ...Spot[]];
  open: boolean;
  // `minutes` is the whole stay, to `end`.
  stay: StudyStay & { minutes: number };
  end: Date;
  endsBy: EndsBy;
}

export interface Faded {
  place: PlacePoint;
  // "열람실 · 경영대학"
  tag: string;
}

export interface PlanContext {
  input: StudyInput;
  way: WayArgs;
  // When the answer is made, for the time card.
  now: Date;
  day: StudyDay;
  ordered: readonly Ranked[];
  faded: readonly Faded[];
}

// What 관정관's plan books (P10 ticket 05): the first 7층 seat for a quiet place or any. A group study room needs
// companions, which proposeStudyRoom books, and 관정관 holds no computers to book.
export const KWANJEONG_SEAT = '7F-7A-zone2';

// The building of the 공부공간 layer whose seats the phone reads, as the layer names it.
export const KWANJEONG_BUILDING = '관정관';

export const bookOf = (what: StudyInput['what']): { spaceId: string } | null =>
  what === 'quiet' || what === 'any' ? { spaceId: KWANJEONG_SEAT } : null;

// The seat 관정관's plan books: the seat space the User chose on the answer, once they chose one (the app keeps it in
// `chosen`), else the first 7층 seat for a quiet place or any.
export const seatToBook = ({ what, chosen }: Pick<StudyInput, 'what' | 'chosen'>): { spaceId: string } | null =>
  chosen.seatSpaceId === null ? bookOf(what) : { spaceId: chosen.seatSpaceId };

// The band reaches an hour before the arrival, unless now is later, and half an hour past the end.
const BAND_BEFORE_MS = 60 * MINUTE_MS;
const BAND_AFTER_MS = 30 * MINUTE_MS;

const strong = (text: string): AnswerLine[number] => ({ text, strong: true });
const plain = (text: string): AnswerLine[number] => ({ text, strong: false });

const chip = (kind: ConditionChip['kind'], text: string): ConditionChip => ({ kind, text, userId: null });

// " · 23:00까지", " · 24시간", or nothing when the hours are not known.
function closesWords({ opening }: StudyHours): string {
  if (opening.state !== 'open') {
    return '';
  }
  return opening.closesAt === null ? ' · 24시간' : ` · ${opening.closesAt}까지`;
}

function spotOf({ space, hours: { opening } }: Spot): StudySpot {
  const { key, name, kind, hours } = space;
  const open = opening.state === 'open';
  return { key, name, kind, hours, open: open ? 'open' : 'unknown', closesAt: open ? opening.closesAt : null };
}

export function chipsOf(
  { input, way }: Pick<PlanContext, 'input' | 'way'>,
  { start, next }: StudyDay,
): ConditionChip[] {
  const naming = new WayNaming(way);
  const { from, until } = input.window;
  const due = next === null ? null : `${dueWords({ at: next.start, isClass: next.isClass })}까지`;
  const end = until === null ? due : `${until}까지`;
  return [
    ...(start === null ? [] : [chip('origin', `${naming.from({ start })}에서`)]),
    ...(from === null ? [] : [chip('from', `${from}부터`)]),
    ...(end === null ? [] : [chip('until', end)]),
    ...(input.area === null ? [] : [chip('area', '보는 범위')]),
    chip('what', STUDY_WHATS[input.what].words),
  ];
}

// The best space and how long it is open; the stay before the next item or the end set; and, for a space whose hours
// are not known, that they are not.
function linesOf({ spots: [best], open, stay, endsBy }: Ranked, { day, input }: PlanContext): AnswerLine[] {
  const closes = closesWords(best.hours);
  const lines: AnswerLine[] = [[strong(best.space.name), ...(closes === '' ? [] : [plain(closes)])]];
  const { next } = day;
  if (endsBy === 'next' && next !== null) {
    lines.push([plain(`${dueWords({ at: next.start, isClass: next.isClass })} 전 ${durationWords(stay.minutes)}`)]);
  }
  if (endsBy === 'until' && input.window.until !== null) {
    lines.push([plain(`${input.window.until}까지 ${durationWords(stay.minutes)}`)]);
  }
  if (!open) {
    lines.push([plain('여는 시간을 몰라요')]);
  }
  return lines;
}

function basisOf({ spots, endsBy, open }: Ranked, { day: { start } }: PlanContext): string[] {
  const guessed = open ? '24시간 여는 곳이라' : '여는 시간을 몰라';
  return [
    ...spots.map(({ space }) => `${space.name}: ${space.hours ?? '여는 시간 정보 없음'}`),
    ...spots.flatMap(({ space, hours }) =>
      hours.confidence === 'low' && space.hours !== null ? [`${space.name}의 여는 시간은 확실하지 않아요`] : [],
    ),
    ...(endsBy === 'guess' ? [`${guessed} 세 시간 머무는 것으로 잡았어요`] : []),
    ...(start?.basis === 'gate' ? [GATE_BASIS] : []),
    ...(start === null ? ['출발 위치를 몰라 걷는 시간은 빼고 쟀어요'] : []),
  ];
}

function partOf({ stay }: Ranked, { way, day: { start, ready, next } }: PlanContext): PlanPart {
  const naming = new WayNaming(way);
  return {
    userId: way.me.userId,
    name: '나',
    me: true,
    origin:
      start === null
        ? null
        : { place: naming.placePoint(start.placeId), basis: start.basis === 'gate' ? 'location' : start.basis },
    leaveAt: koreaTime(ready),
    walkMinutes: start === null ? null : stay.walkMinutes,
    leaveBy: stay.leaveBy === null ? null : koreaTime(stay.leaveBy),
    next:
      next === null
        ? null
        : { startAt: koreaTime(next.start), place: next.placeId === null ? null : naming.placePoint(next.placeId) },
  };
}

const tagOf = ({ spots: [best], open }: Ranked): string =>
  `${best.space.name}${open ? closesWords(best.hours) : ' · 시간 모름'}`;

interface Onward {
  placeId: string;
  minutes: number;
}

// The walk on from the building to the next item's Place, when it is elsewhere.
function onwardOf(placeId: string, { way, day: { next } }: PlanContext): Onward | null {
  if (next?.placeId === null || next === null || next.placeId === placeId) {
    return null;
  }
  return { placeId: next.placeId, minutes: shownMinutes(way.travel.walkingSeconds(placeId, next.placeId)) };
}

// Every plan's building numbered as the list numbers it, this one the pick; the faded ones; and the next item.
function placesOf(index: number, onward: Onward | null, { way, day, ordered, faded }: PlanContext): MapScene['places'] {
  const naming = new WayNaming(way);
  const { next } = day;
  const due = next === null ? null : dueWords({ at: next.start, isClass: next.isClass });
  return [
    ...ordered.map((one, order) => ({
      place: pointOf(one.building),
      role: order === index ? ('pick' as const) : ('candidate' as const),
      tag: tagOf(one),
      order: order + 1,
    })),
    ...faded.map(({ place, tag }) => ({ place, role: 'dropped' as const, tag })),
    ...(onward === null || due === null
      ? []
      : [
          {
            place: naming.placePoint(onward.placeId),
            role: 'next' as const,
            tag: `${due} · ${naming.placeLabel(onward.placeId)}`,
          },
        ]),
  ];
}

// The walk there, and on to the next item.
function routesOf(ranked: Ranked, onward: Onward | null, { way, day: { start } }: PlanContext): MapScene['routes'] {
  const naming = new WayNaming(way);
  const at = naming.position(ranked.building.place.id);
  const { userId } = way.me;
  const routes: MapScene['routes'] = [];
  if (start !== null && ranked.stay.walkMinutes > 0) {
    routes.push({ userId, role: 'me', from: naming.position(start.placeId), to: at, minutes: ranked.stay.walkMinutes });
  }
  if (onward !== null && onward.minutes > 0) {
    routes.push({ userId, role: 'next', from: at, to: naming.position(onward.placeId), minutes: onward.minutes });
  }
  return routes;
}

function sceneOf(ranked: Ranked, index: number, context: PlanContext): MapScene {
  const naming = new WayNaming(context.way);
  const { start } = context.day;
  const onward = onwardOf(ranked.building.place.id, context);
  return {
    people: start === null ? [] : [naming.me({ start })],
    places: placesOf(index, onward, context),
    routes: routesOf(ranked, onward, context),
    flags: [
      {
        at: naming.position(ranked.building.place.id),
        text: `${clockOf(ranked.stay.arrival)} 공부`,
        role: 'place',
      },
    ],
  };
}

function bandOf({ stay, end }: Ranked, { now, way }: PlanContext): TimeBand {
  const naming = new WayNaming(way);
  const { from, until } = halfHoursAround(
    Math.max(now.getTime(), stay.arrival.getTime() - BAND_BEFORE_MS),
    end.getTime() + BAND_AFTER_MS,
  );
  return {
    range: { startAt: koreaTime(from), endAt: koreaTime(until) },
    now: koreaTime(now),
    lanes: [
      {
        userId: way.me.userId,
        name: '나',
        busy: busyIn(way.me.items, from, until, (placeId) => naming.placeLabel(placeId)),
      },
    ],
    startAt: koreaTime(stay.arrival),
    endAt: koreaTime(end),
    text: `${clockOf(stay.arrival)}–${clockOf(end)}`,
  };
}

// One building's plan, numbered `index + 1` in the list.
export function planOf(ranked: Ranked, index: number, context: PlanContext): Plan {
  const { building, stay, end, spots } = ranked;
  return {
    id: building.name,
    title: `${building.name}에서 공부`,
    place: pointOf(building),
    startAt: koreaTime(stay.arrival),
    endAt: koreaTime(end),
    togetherMinutes: stay.minutes,
    meeting: null,
    parts: [partOf(ranked, context)],
    subQuests: [],
    lines: linesOf(ranked, context),
    basis: basisOf(ranked, context),
    scene: sceneOf(ranked, index, context),
    band: bandOf(ranked, context),
    study: {
      spaces: spots.map((spot) => spotOf(spot)),
      book: building.liveSeats === null ? null : seatToBook(context.input),
      liveSeats: building.liveSeats === null ? null : 'kwanjeong',
    },
  };
}
