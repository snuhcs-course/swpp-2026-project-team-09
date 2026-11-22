/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, MapScene, Plan } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { color } from '@/design-system';
import { koreaClock } from '@/korea-time';
import type { MapLine } from '@/map';
import { type Draft, ROUTE_STYLES } from './answer-groups';
import { metresBetween } from './answer-drawing';
import { fixedAfter, fixedBefore, routeLineId } from './answer-walks';

// Whether an answer is drawn as a meal answer of the redesign: a meal whose Plans have menus.
export function drawsMeal({ input, plans }: AnswerReply): boolean {
  return input.kind === 'meal' && plans.some(({ menu }) => menu !== undefined);
}

// A meal answer's route on the map (the answer screen's redesign, board E1): the way to the chosen place solid, the
// way on to the next fixed thing dotted, each leg with its minutes, and the start and the next thing as dark labels
// with their times ("10:45 301동", "15:30 302동 수업").

const WAY_ON = { color: color.snuBlue, width: 4, dash: [1, 8] } as const;

function midway(from: LatLng, to: LatLng): LatLng {
  return { latitude: (from.latitude + to.latitude) / 2, longitude: (from.longitude + to.longitude) / 2 };
}

function legDrafts(scene: MapScene): Draft[] {
  return scene.routes.flatMap(({ role, from, to, minutes }, index): Draft[] =>
    (role === 'me' || role === 'next') && minutes > 0
      ? [
          {
            id: `answer:leg:${String(index)}`,
            name: `걸음 ${String(minutes)}분`,
            position: midway(from, to),
            planId: null,
            group: 'flag',
            symbol: null,
            tone: 'leg',
            title: `${String(minutes)}분`,
            line: null,
            number: null,
          },
        ]
      : [],
  );
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

// The drafts of a meal Plan's scene with its start and next thing as dark labels and its legs' minutes; without a
// Plan, as they are.
export function mealDrafts(plan: Plan | undefined, scene: MapScene, drafts: readonly Draft[]): Draft[] {
  if (plan === undefined) {
    return [...drafts];
  }
  const marked = drafts.map((draft) => {
    if (draft.id === 'answer:me') {
      return dark(draft, startWords(plan));
    }
    return draft.group === 'next' ? dark(draft, nextWords(plan, draft.title)) : draft;
  });
  return [...marked, ...legDrafts(scene)];
}

// The lines of a scene's routes: a meal Plan's way on to the next fixed thing dotted, the rest in their own style.
export function sceneLines(scene: MapScene, meal: boolean): MapLine[] {
  return scene.routes.map(({ role, from, to }, index) => ({
    id: routeLineId(index),
    points: [from, to],
    style: meal && role === 'next' ? WAY_ON : ROUTE_STYLES[role],
  }));
}

// The native map draws every line solid, so the way on is drawn as dots: short round-ended pieces every 24 metres.
const DOT = { length: 2, every: 24 };
const DOT_STYLE = { color: color.snuBlue, width: 6 } as const;

function along(from: LatLng, to: LatLng, share: number): LatLng {
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * share,
    longitude: from.longitude + (to.longitude - from.longitude) * share,
  };
}

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
  return lines.flatMap((line) =>
    line.style === WAY_ON
      ? dotsOf(line.points).map((points, at) => ({ id: `${line.id}:dot:${String(at)}`, points, style: DOT_STYLE }))
      : [line],
  );
}
