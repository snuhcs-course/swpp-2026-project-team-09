/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Cuisine, MapScene, Plan } from '@/api/assistant-types';
import type { AnswerSymbol } from '@/design-system';
import { koreaClock } from '@/korea-time';
import type { AnswerLabel } from '@/design-system';
import { inView } from '@/map';
import type { LatLng } from '@/api/types';
import { type Draft, restOf, SIDE_ORDER } from './answer-groups';
import { inside, type LabelView } from './answer-labels';
import { addedWalk, fadedPlan } from './answer-walks';
import { serves } from './meal-kinds';
import { dishWords, menuLine } from './meal-menus';
import { mealPickLabel } from './meal-pick';

// The words of an answer's pick and other candidates on the map (P04 ticket 13, boards 20 to 22).

// The pick's time with the Plan's day before it. A flag the main server already wrote with its day ("내일(토) 18:00
// 배드민턴") keeps it once.
function dayAndTime(time: string | null, day: string | undefined): string | null {
  if (day === undefined || day === '' || (time?.includes(day) ?? false)) {
    return time;
  }
  return time === null ? day : `${day} ${time}`;
}

// The pick's line: its time with the Plan's day, and a meal Plan's first dish, of the kind on screen when it has one,
// with the count of the rest.
export function pickLine(
  time: string | null,
  day: string | undefined,
  plan: Plan | undefined,
  kind: Cuisine | null = null,
): string | null {
  const when = dayAndTime(time, day);
  const dishes = plan?.menu === undefined ? null : dishWords(plan.menu, kind);
  if (dishes === null) {
    return when;
  }
  return when === null ? dishes : `${when} · ${dishes}`;
}

// The chosen place of a scene: a meal answer's with menus says its time and main dish (`mealPickLabel`); any other its
// flag's words, its day, and its first dish (`pickLine`). Any meal answer's, menus or none, is coral (P04 ticket 90).
export function pickDraft(
  pick: {
    title: string;
    position: LatLng;
    number: number | null;
    plan: Plan | undefined;
    day: string | undefined;
    kind: Cuisine | null;
    meal: boolean;
    coral: boolean;
  },
  flagText: string | null,
): Draft {
  const { title, position, number, plan, day, kind, meal, coral } = pick;
  const symbol: AnswerSymbol = { type: 'dot', role: 'pick', number, ...(coral ? { meal: true } : {}) };
  const base = {
    id: 'answer:pick',
    position,
    planId: null,
    group: 'pick',
    tone: 'pick',
    number,
    ...(coral ? { coral } : {}),
  } as const;
  if (meal && plan !== undefined) {
    return { ...base, symbol: { ...symbol, meal: true }, ...mealPickLabel(plan, title, kind) };
  }
  const line = pickLine(flagText === null ? null : restOf(title, flagText), day, plan, kind);
  return { ...base, name: line === null ? title : `${title} · ${line}`, symbol, title, line };
}

// A candidate without the kind of food on screen (board 25): its name alone in grey, with no number and no dot. A
// press still picks it.
function recededDraft(plan: Plan, { place, tag }: MapScene['places'][number]): Draft {
  const title = tag ?? place.label;
  return {
    id: `answer:candidate:${place.label}`,
    name: title,
    position: { latitude: place.latitude, longitude: place.longitude },
    planId: plan.id,
    group: 'candidate',
    symbol: null,
    tone: 'dropped',
    title,
    line: null,
    number: null,
  };
}

// A meal answer's candidate (the answer screen's redesign, board E1): its numbered round and the walking it adds to the
// User's day ("26분"), or its arrival time when that walking is not known, in a capsule beside the round (P04 ticket
// 83). A screen reader reads its name too.
function mealDraft(plan: Plan, number: number, { place, tag }: MapScene['places'][number]): Draft {
  const title = tag ?? place.label;
  const walk = addedWalk(plan);
  const value = walk === null ? koreaClock(plan.startAt) : `${String(walk)}분`;
  const said = walk === null ? `${value} 도착` : `걸음 ${value}`;
  const faded = fadedPlan(plan);
  const round = [`후보 ${String(number)}`, title].join(' · ');
  return {
    id: `answer:candidate:${place.label}`,
    name: `${round} · ${said}`,
    roundName: round,
    position: { latitude: place.latitude, longitude: place.longitude },
    planId: plan.id,
    group: 'candidate',
    symbol: { type: 'dot', role: 'candidate', number, meal: true, ...(faded ? { faded } : {}) },
    tone: 'candidate',
    title: value,
    ...(faded ? { faded } : {}),
    line: null,
    number,
  };
}

// Another candidate: its number, its name, and its arrival time. A meal answer's is a small tag (`mealDraft`); one
// without the kind of food on screen recedes.
export function candidateDraft(
  plans: readonly Plan[],
  item: MapScene['places'][number],
  kind: Cuisine | null = null,
  meal = false,
  coral = false,
): Draft {
  const { place, tag } = item;
  const title = tag ?? place.label;
  const index = plans.findIndex((plan) => plan.place.placeId === place.placeId && plan.place.label === place.label);
  const plan: Plan | undefined = plans[index];
  if (plan !== undefined && kind !== null && !serves(plan, kind)) {
    return recededDraft(plan, item);
  }
  if (plan !== undefined && meal) {
    return mealDraft(plan, index + 1, item);
  }
  const number = plan === undefined ? null : index + 1;
  const time = plan === undefined ? null : koreaClock(plan.startAt);
  const sub = menuLine(plan?.menu, kind);
  const said = [time, sub].flatMap((words) => words ?? []);
  const symbol: AnswerSymbol = { type: 'dot', role: 'candidate', number, ...(coral ? { meal: true } : {}) };
  return {
    ...(coral ? { coral } : {}),
    id: `answer:candidate:${place.label}`,
    name: number === null ? title : [`후보 ${String(number)}`, title, ...said].join(' · '),
    position: { latitude: place.latitude, longitude: place.longitude },
    planId: plan?.id ?? null,
    group: 'candidate',
    symbol,
    tone: 'candidate',
    title,
    line: time,
    sub,
    number,
  };
}

// Past any number a Plan has.
const UNNUMBERED = 1000;

// The order labels take sides in: by their kinds (`SIDE_ORDER`), held candidates (a tag that is their own way to be
// pressed) before the others, and candidates by their number.
export function sideRank({ draft, held }: { draft: Draft; held: boolean }): number {
  const rank = SIDE_ORDER.indexOf(draft.group) - (held ? 0.5 : 0);
  return draft.group === 'candidate' ? rank + (draft.number ?? UNNUMBERED) / (UNNUMBERED + 1) / 2 : rank;
}

interface Labelled {
  draft: Draft;
  held: boolean;
  label: AnswerLabel | null;
  // A meal candidate's minutes beside its round (P04 ticket 83).
  capsule?: boolean;
}

// Whether a mark's point is in the view's area, where its tag could be read; without a view, every one is.
function seenAt(view: LabelView | null, { position }: Draft): boolean {
  if (view === null) {
    return true;
  }
  const { x, y } = inView(position, view.camera, view.size);
  return inside({ top: y, right: x, bottom: y, left: x }, view.area);
}

// Where room is short, the tags of the candidates in the view's area whose own numbered dot is drawn are left out from
// the lowest rank upward: once one has none, none after it has one. The dot stays and takes the press. A held
// candidate always keeps its tag. A meal candidate's minutes are left out on their own, only where they have no room
// (P04 ticket 84): the user wants each candidate's minutes wherever they fit, nearer numbers still placed first.
export function leftOutByRank<T extends Labelled>(placed: readonly T[], view: LabelView | null): T[] {
  const lone = placed
    .filter(
      ({ draft, held, capsule = false }) => draft.group === 'candidate' && !held && !capsule && seenAt(view, draft),
    )
    .toSorted((one, other) => (one.draft.number ?? UNNUMBERED) - (other.draft.number ?? UNNUMBERED));
  const first = lone.findIndex(({ label }) => label === null);
  const out = new Set(first === -1 ? [] : lone.slice(first));
  return placed.map((one) => (out.has(one) ? { ...one, label: null } : one));
}
