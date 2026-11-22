/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, MapScene, Plan } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { color, type LabelSide } from '@/design-system';
import { koreaClock } from '@/korea-time';
import type { MapLine } from '@/map';
import { type Draft, ROUTE_STYLES } from './answer-groups';
import { metresBetween } from './answer-drawing';
import { fixedAfter, fixedBefore, routeLineId } from './answer-walks';
import { BY_SHUTTLE, NO_WAYS, shuttleLines, shuttleRouteLines, stopDrafts, type Ways } from './shuttle-legs';

// Whether an answer is drawn as a meal answer of the redesign: a meal whose Plans have menus.
export function drawsMeal({ input, plans }: AnswerReply): boolean {
  return input.kind === 'meal' && plans.some(({ menu }) => menu !== undefined);
}

// A meal answer's route on the map (the answer screen's redesign, board E1): the way to the chosen place solid, the
// way on to the next fixed thing dotted, each leg with its minutes, and the start and the next thing as dark labels
// with their times ("10:45 301동", "15:30 302동 수업").

const WAY_ON = { color: color.snuBlue, width: 4, dash: [1, 8] } as const;

function along(from: LatLng, to: LatLng, share: number): LatLng {
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * share,
    longitude: from.longitude + (to.longitude - from.longitude) * share,
  };
}

// Where along its leg a leg's minutes may stand, in order: the middle first.
const ALONG = [0.5, 0.35, 0.65, 0.2, 0.8] as const;

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
function legsOf(scene: MapScene): { route: MapScene['routes'][number]; index: number }[] {
  return scene.routes.flatMap((route, index) =>
    (route.role === 'me' || route.role === 'next') && route.minutes > 0 ? [{ route, index }] : [],
  );
}

// The places a leg's minutes may stand at, in order: along its drawn line clear of faces, then over a face, which then
// gives way (`facesClearOf`), then its middle whatever it covers but the lines and the labels placed before it.
function legPlaces(line: readonly LatLng[]): { position: LatLng; overFaces: boolean; always: boolean }[] {
  const at = (share: number): LatLng[] => {
    const point = pointAlong(line, share);
    return point === null ? [] : [point];
  };
  return [
    ...ALONG.flatMap((share) => at(share).map((position) => ({ position, overFaces: false, always: false }))),
    ...ALONG.flatMap((share) => at(share).map((position) => ({ position, overFaces: true, always: false }))),
    ...at(ALONG[0]).map((position) => ({ position, overFaces: true, always: true })),
  ];
}

// A leg's label: "셔틀 12분" by shuttle, "6분" on foot. It may stand anywhere along its leg as drawn (`either`) and keeps
// clear of the legs' lines. Its id carries its words, so that a leg whose words change is a new mark: the native map
// would otherwise keep the picture of the words before until the new one is made.
function legDrafts(scene: MapScene, ways: Ways, lines: readonly (readonly LatLng[])[]): Draft[] {
  return legsOf(scene).flatMap(({ route: { minutes, mode }, index }): Draft[] => {
    const title = mode === 'shuttle' ? `셔틀 ${String(minutes)}분` : `${String(minutes)}분`;
    const id = `answer:leg:${String(index)}:${title}`;
    return legPlaces(legLine(scene, index, ways)).map(({ position, overFaces, always }) => ({
      id,
      name: mode === 'shuttle' ? title : `걸음 ${String(minutes)}분`,
      position,
      planId: null,
      group: 'leg',
      symbol: null,
      tone: 'leg',
      title,
      line: null,
      number: null,
      clearOf: lines,
      either: id,
      overFaces,
      always,
    }));
  });
}

// "10:45 301동": when the thing before ends, and where the User sets out from.
function startWords(plan: Plan): string | null {
  const before = fixedBefore(plan);
  const from = plan.parts.find(({ me }) => me)?.origin?.place.label;
  return before === null || from === undefined ? null : `${koreaClock(before.at)} ${from}`;
}

// "15:30 302동 수업": when the next fixed thing starts, and what it is.
function nextWords(plan: Plan, place: string | null): string | null {
  const after = fixedAfter(plan);
  const what = after?.label ?? place;
  return after === null || what === null ? null : `${koreaClock(after.at)} ${what}`;
}

function dark(draft: Draft, words: string | null): Draft {
  return words === null ? draft : { ...draft, name: words, title: words, line: null, tone: 'meeting' };
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
  const lines = legsOf(scene).flatMap(({ index }) => drawnLines(scene, index, ways));
  const marked = drafts.map((draft) => {
    if (draft.id === 'answer:me') {
      return dark(draft, startWords(plan));
    }
    if (draft.group === 'pick') {
      return { ...draft, sides: PICK_SIDES, clearOf: lines };
    }
    return draft.group === 'next' ? dark(draft, nextWords(plan, draft.title)) : draft;
  });
  return [...marked, ...legDrafts(scene, ways, lines), ...stopDrafts(ways.legs)];
}

// The lines of a scene's routes: a meal Plan's way on to the next fixed thing dotted, a meal Plan's leg by the shuttle
// as its walks and its ride (`shuttleRouteLines`), the rest in their own style.
export function sceneLines(scene: MapScene, meal: boolean, ways: Ways = NO_WAYS): MapLine[] {
  return scene.routes.flatMap((route, index): MapLine[] => {
    const { role, from, to, mode } = route;
    if (meal && mode === 'shuttle' && (role === 'me' || role === 'next')) {
      return shuttleRouteLines(route, index, ways);
    }
    return [
      { id: routeLineId(index), points: [from, to], style: meal && role === 'next' ? WAY_ON : ROUTE_STYLES[role] },
    ];
  });
}

// The native map draws every line solid, so the way on is drawn as dots: short round-ended pieces every 24 metres.
const DOT = { length: 2, every: 24 };
const DOT_STYLE = { color: color.snuBlue, width: 6 } as const;
const SHUTTLE_DOT_STYLE = { color: BY_SHUTTLE.color, width: 6 } as const;

// The dots of one straight piece from `walked` metres along the way, from the next dot's place `next` on.
function piece(from: LatLng, to: LatLng, walked: number, next: number, dots: LatLng[][]): number {
  const length = metresBetween(from, to);
  if (length === 0) {
    return next;
  }
  let at = next;
  while (at + DOT.length <= walked + length) {
    const start = (at - walked) / length;
    dots.push([along(from, to, start), along(from, to, start + DOT.length / length)]);
    at += DOT.every;
  }
  return at;
}

function dotsOf(points: readonly LatLng[]): LatLng[][] {
  const dots: LatLng[][] = [];
  let next = DOT.every / 2;
  let walked = 0;
  for (let at = 1; at < points.length; at += 1) {
    const from = points[at - 1];
    const to = points[at];
    if (from !== undefined && to !== undefined) {
      next = piece(from, to, walked, next, dots);
      walked += metresBetween(from, to);
    }
  }
  return dots;
}

// The lines with a meal Plan's way on (`WAY_ON`) as its dots, once its path is known or straight.
export function withDots(lines: readonly MapLine[]): MapLine[] {
  return lines.flatMap((line) => {
    const style = line.style === WAY_ON ? DOT_STYLE : line.style === BY_SHUTTLE ? SHUTTLE_DOT_STYLE : null;
    return style === null
      ? [line]
      : dotsOf(line.points).map((points, at) => ({ id: `${line.id}:dot:${String(at)}`, points, style }));
  });
}
