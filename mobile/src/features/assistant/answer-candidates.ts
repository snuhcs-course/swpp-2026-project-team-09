/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MapScene, Plan } from '@/api/assistant-types';
import type { AnswerSymbol } from '@/design-system';
import { koreaClock } from '@/korea-time';
import type { AnswerLabel } from '@/design-system';
import { inView } from '@/map';
import { type Draft, SIDE_ORDER } from './answer-groups';
import { inside, type LabelView } from './answer-labels';
import { dishWords, menuLine } from './meal-menus';

// The words of an answer's pick and other candidates on the map (P04 ticket 13, boards 20 to 22).

// The pick's time with the Plan's day before it. A flag the main server already wrote with its day ("내일(토) 18:00
// 배드민턴") keeps it once.
function dayAndTime(time: string | null, day: string | undefined): string | null {
  if (day === undefined || day === '' || (time?.includes(day) ?? false)) {
    return time;
  }
  return time === null ? day : `${day} ${time}`;
}

// The pick's line: its time with the Plan's day, and a meal Plan's first dish with the count of the rest.
export function pickLine(time: string | null, day: string | undefined, plan: Plan | undefined): string | null {
  const when = dayAndTime(time, day);
  const dishes = plan?.menu === undefined ? null : dishWords(plan.menu);
  if (dishes === null) {
    return when;
  }
  return when === null ? dishes : `${when} · ${dishes}`;
}

// Another candidate: its number, its name, and its arrival time, and in a meal answer its dishes and price under
// them. A screen reader reads the same words.
export function candidateDraft(plans: readonly Plan[], { place, tag }: MapScene['places'][number]): Draft {
  const title = tag ?? place.label;
  const index = plans.findIndex((plan) => plan.place.placeId === place.placeId && plan.place.label === place.label);
  const plan: Plan | undefined = plans[index];
  const number = plan === undefined ? null : index + 1;
  const time = plan === undefined ? null : koreaClock(plan.startAt);
  const sub = menuLine(plan?.menu);
  const said = [time, sub].flatMap((words) => words ?? []);
  const symbol: AnswerSymbol = { type: 'dot', role: 'candidate', number };
  return {
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

// The order labels take sides in: by their kinds (`SIDE_ORDER`), candidates sharing a point before those alone, and
// candidates by their number.
export function sideRank({ draft, shared }: { draft: Draft; shared: boolean }): number {
  const rank = SIDE_ORDER.indexOf(draft.group) - (shared ? 0.5 : 0);
  return draft.group === 'candidate' ? rank + (draft.number ?? UNNUMBERED) / (UNNUMBERED + 1) / 2 : rank;
}

interface Labelled {
  draft: Draft;
  shared: boolean;
  label: AnswerLabel | null;
}

// Whether a mark's point is in the view's area, where its tag could be read; without a view, every one is.
function seenAt(view: LabelView | null, { position }: Draft): boolean {
  if (view === null) {
    return true;
  }
  const { x, y } = inView(position, view.camera, view.size);
  return inside({ top: y, right: x, bottom: y, left: x }, view.area);
}

// Where room is short, the tags of the candidates that stand alone in the view's area are left out from the lowest
// rank upward: once one has none, none after it has one. Its numbered dot stays and takes the press.
export function leftOutByRank<T extends Labelled>(placed: readonly T[], view: LabelView | null): T[] {
  const lone = placed
    .filter(({ draft, shared }) => draft.group === 'candidate' && !shared && seenAt(view, draft))
    .toSorted((one, other) => (one.draft.number ?? UNNUMBERED) - (other.draft.number ?? UNNUMBERED));
  const first = lone.findIndex(({ label }) => label === null);
  const out = new Set(first === -1 ? [] : lone.slice(first));
  return placed.map((one) => (out.has(one) ? { ...one, label: null } : one));
}
