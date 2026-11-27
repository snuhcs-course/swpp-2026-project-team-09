/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, MapScene, Plan } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { type LabelSide, type LegTone } from '@/design-system';
import { koreaClock } from '@/korea-time';
import type { MapLine } from '@/map';
import { type Draft, LEG_STYLES, ROUTE_STYLES } from './answer-groups';
import { metresBetween } from './answer-drawing';
import { fixedAfter, routeLineId, startOf } from './answer-walks';
import { NO_WAYS, shuttleLines, shuttleRouteLines, stopDrafts, type Ways } from './shuttle-legs';

// Whether an answer is drawn as a meal answer of the redesign: a meal whose Plans have menus, or a study answer alone,
// whose places are candidates as a meal's (P10 ticket 17). A study answer together is the group study room's.
export function drawsMeal({ input, plans }: AnswerReply): boolean {
  if (input.kind === 'study') {
    return studyAlone({ input, plans });
  }
  return input.kind === 'meal' && plans.some(({ menu }) => menu !== undefined);
}

// A study answer of places to study alone: not together, no Friend added, and no Plan with a group study room.
export function studyAlone({ input, plans }: Pick<AnswerReply, 'input' | 'plans'>): boolean {
  return (
    input.kind === 'study' &&
    !input.together &&
    input.people.length === 1 &&
    plans.length > 0 &&
    plans.every(({ study }) => study !== undefined && study.group === undefined)
  );
}

// A meal answer's route on the map (the answer screen's redesign, board E1; P04 ticket 76): the way to the chosen place
// a dark thin line and the way on to the next fixed thing a pale band under it, walking blue and the shuttle purple
// (`LEG_STYLES`), each leg with its minutes in its line's colours, and the start and the next thing as dark labels with
// their times ("10:45 301동", "15:30 302동 수업").

function along(from: LatLng, to: LatLng, share: number): LatLng {
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * share,
    longitude: from.longitude + (to.longitude - from.longitude) * share,
  };
}

// Where along its leg a leg's minutes may stand, in order: the middle first.
const ALONG = [0.5, 0.35, 0.65, 0.2, 0.8] as const;

// A leg's minutes, the whole leg's time: the way there dark, the way on pale, whatever the mode.
function legToneOf(on: boolean): LegTone {
  return on ? 'legOn' : 'leg';
}

// The paths a scene's walks were found along, by their lines' ids (`routeLineId`); a route not in it is drawn straight.
export type WalkPaths = Ways['paths'];

// The way a leg's minutes stand on: its ride when it is by the shuttle, else its walk along its path once found, else
// straight.
function legLine(scene: MapScene, index: number, ways: Ways): readonly LatLng[] {
  const route = scene.routes[index];
  const ride = ways.legs.find((leg) => leg.index === index)?.ride;
  return ride ?? ways.paths.get(routeLineId(index)) ?? (route === undefined ? [] : [route.from, route.to]);
}

// Every line a leg is drawn with, which the labels keep clear of.
function drawnLines(scene: MapScene, index: number, ways: Ways): (readonly LatLng[])[] {
  const leg = ways.legs.find((one) => one.index === index);
  return leg === undefined ? [legLine(scene, index, ways)] : shuttleLines(leg, ways).map(({ points }) => points);
}

// The point a share of a line's length along it.
function pointAlong(line: readonly LatLng[], share: number): LatLng | null {
  const lengths = line.slice(1).map((to, at) => metresBetween(line[at] ?? to, to));
  let left = lengths.reduce((total, one) => total + one, 0) * share;
  for (const [at, length] of lengths.entries()) {
    const from = line[at];
    const to = line[at + 1];
    if (from !== undefined && to !== undefined && (left <= length || at === lengths.length - 1)) {
      return along(from, to, length === 0 ? 0 : Math.min(1, left / length));
    }
    left -= length;
  }
  return line[0] ?? null;
}

// The Plan's legs: the way to the place and the way on, with their indexes among the scene's routes.
function legsOf(scene: MapScene, hidden: ReadonlySet<number>): { route: MapScene['routes'][number]; index: number }[] {
  return scene.routes.flatMap((route, index) =>
    (route.role === 'me' || route.role === 'next') && route.minutes > 0 && !hidden.has(index) ? [{ route, index }] : [],
  );
}

// The places a leg's minutes may stand at, in order: along its drawn line clear of faces, then over a face, which then
// gives way (`facesClearOf`). With none free, the minutes are left out: they give way to every other label.
function legPlaces(line: readonly LatLng[]): { position: LatLng; overFaces: boolean }[] {
  const at = (share: number): LatLng[] => {
    const point = pointAlong(line, share);
    return point === null ? [] : [point];
  };
  return [
    ...ALONG.flatMap((share) => at(share).map((position) => ({ position, overFaces: false }))),
    ...ALONG.flatMap((share) => at(share).map((position) => ({ position, overFaces: true }))),
  ];
}

// A leg's label, the whole leg's minutes: "12분", by the shuttle too, which a screen reader says "셔틀 12분" (P04 ticket
// 80); dark for the way there and pale for the way on (`legToneOf`). It may stand anywhere along its leg as drawn
// (`either`) and keeps clear of the legs' lines. Its id carries its words, so that a leg whose words
// change is a new mark: the native map would otherwise keep the picture of the words before until the new one is made.
function legDrafts(
  scene: MapScene,
  ways: Ways,
  lines: readonly (readonly LatLng[])[],
  hidden: ReadonlySet<number>,
): Draft[] {
  return legsOf(scene, hidden).flatMap(({ route: { minutes, mode, role }, index }): Draft[] => {
    const title = `${String(minutes)}분`;
    const id = `answer:leg:${String(index)}:${title}`;
    return legPlaces(legLine(scene, index, ways)).map(({ position, overFaces }) => ({
      id,
      name: mode === 'shuttle' ? `셔틀 ${title}` : `걸음 ${title}`,
      position,
      planId: null,
      group: 'leg',
      symbol: null,
      tone: legToneOf(role === 'next'),
      title,
      line: null,
      number: null,
      clearOf: lines,
      either: id,
      overFaces,
    }));
  });
}

// The minutes of a scene's ways with no meal Plan, as a meal Plan's legs carry theirs: a 관정 booking's way there (P01
// ticket 10).
export function wayMinutesDrafts(scene: MapScene, ways: Ways = NO_WAYS): Draft[] {
  const lines = legsOf(scene, NONE_HIDDEN).flatMap(({ index }) => drawnLines(scene, index, ways));
  return legDrafts(scene, ways, lines, NONE_HIDDEN);
}

// Where the User sets out from, as the answer used it (`startOf`): "10:45 301동", the end of the Class or the Quest there;
// "301동" alone when no such thing ends there between now and the meal; "지금 · 내 위치" from their position; none
// when it is not known.
function startWords(plan: Plan): string | null {
  const start = startOf(plan);
  if (start === null) {
    return null;
  }
  if (start.kind === 'here') {
    return '지금 · 내 위치';
  }
  return start.kind === 'item' ? `${koreaClock(start.at)} ${start.place}` : start.place;
}

// The indexes of a meal Plan's routes not drawn: the User's way to the place when where they set out from is not known,
// so that no line is drawn from nowhere. Their indexes keep the other routes' lines and paths as they are.
export function hiddenRoutes(plan: Plan | undefined, scene: MapScene): ReadonlySet<number> {
  const me = plan?.parts.find((part) => part.me);
  if (me === undefined || me.origin !== null) {
    return NONE_HIDDEN;
  }
  return new Set(
    scene.routes.flatMap(({ role, userId }, index) => (role === 'me' && userId === me.userId ? [index] : [])),
  );
}

const NONE_HIDDEN: ReadonlySet<number> = new Set();

// "15:30 302동": when the next fixed thing starts and where, in the start's format, with no word of what it is (P04
// ticket 80). The time is the Plan's next fixed thing's, or the one its place's tag begins with ("15:30 수업 · 302동").
function nextWords(plan: Plan, item: MapScene['places'][number] | undefined): string | null {
  const after = fixedAfter(plan);
  const clock = after === null ? (item?.tag?.match(/^\d{1,2}:\d{2}/u)?.[0] ?? null) : koreaClock(after.at);
  return clock === null || item === undefined ? null : `${clock} ${item.place.label}`;
}

function nextOf(scene: MapScene, id: string): MapScene['places'][number] | undefined {
  return scene.places.find(({ role, place }) => role === 'next' && `answer:next:${place.placeId}` === id);
}

// A dark label may stand on any side of its point, so that it moves round when a side is taken.
const DARK_SIDES: LabelSide[] = ['left', 'right', 'above', 'below'];

function dark(draft: Draft, words: string | null): Draft {
  return words === null
    ? draft
    : { ...draft, name: words, title: words, line: null, tone: 'meeting', sides: DARK_SIDES };
}

// A meal pick's label may also stand beside it, so that it can keep clear of the route.
const PICK_SIDES: LabelSide[] = ['below', 'above', 'right', 'left'];

// The drafts of a meal Plan's scene with its start and next thing as dark labels, its legs' minutes on the ways they
// are drawn along (`ways`), and the stops of its legs by the shuttle; without a Plan, as they are.
export function mealDrafts(
  plan: Plan | undefined,
  scene: MapScene,
  drafts: readonly Draft[],
  ways: Ways = NO_WAYS,
): Draft[] {
  if (plan === undefined) {
    return [...drafts];
  }
  const hidden = hiddenRoutes(plan, scene);
  const lines = legsOf(scene, hidden).flatMap(({ index }) => drawnLines(scene, index, ways));
  const marked = drafts.map((draft) => {
    if (draft.id === 'answer:me') {
      return dark(draft, startWords(plan));
    }
    if (draft.group === 'pick') {
      return { ...draft, sides: PICK_SIDES, clearOf: lines };
    }
    return draft.group === 'next' ? dark(draft, nextWords(plan, nextOf(scene, draft.id))) : draft;
  });
  return [...marked, ...legDrafts(scene, ways, lines, hidden), ...stopDrafts(ways.legs)];
}

// The lines of a scene's routes. A meal Plan's way there is a dark thin line and its way on a pale band, each by the
// shuttle as its walks and its ride (`shuttleRouteLines`), the bands first, so that the native map, which draws a later
// line on top, lays each line over the band of a way on that shares its road (P04 ticket 76). The rest keep their own
// style, in their order.
export function sceneLines(
  scene: MapScene,
  meal: boolean,
  ways: Ways = NO_WAYS,
  hidden: ReadonlySet<number> = NONE_HIDDEN,
): MapLine[] {
  const drawn = scene.routes.flatMap((route, index): { on: boolean; lines: MapLine[] }[] => {
    const { role, from, to, mode } = route;
    if (hidden.has(index)) {
      return [];
    }
    const leg = meal && (role === 'me' || role === 'next');
    const on = leg && role === 'next';
    if (leg && mode === 'shuttle') {
      return [{ on, lines: shuttleRouteLines(route, index, ways, on) }];
    }
    const style = leg ? (on ? LEG_STYLES.walkOn : LEG_STYLES.walkThere) : ROUTE_STYLES[role];
    return [{ on, lines: [{ id: routeLineId(index), points: [from, to], style }] }];
  });
  return [...drawn.filter(({ on }) => on), ...drawn.filter(({ on }) => !on)].flatMap(({ lines }) => lines);
}

// The lines as they are: a meal Plan's way on was once drawn as dots, which the native map could not dash, and is a
// band since P04 ticket 76. Kept for `use-answer-walks.ts` until the path's own ticket (75) drops the call.
export function withDots(lines: readonly MapLine[]): MapLine[] {
  return [...lines];
}
