/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { UNHURRIED_MEAL_SECONDS } from '../../travel/judgement-constants.js';
import { type Plan, type PlanPart } from '../dto/answer.dto.js';
import { withAnd, withTopic } from './answer-words.js';
import { type GatheringFit, type PersonPart } from './gathering.js';

// How a gathering's plans are put in order. A meal's, `walking`: those where everyone has an unhurried meal first, then
// the rest, each the least walking first. A meet's, `together`: being together longest is the point of meeting.
export type PlanOrder = 'walking' | 'together';

type Fit = Pick<GatheringFit, 'key' | 'start' | 'togetherMinutes' | 'parts'>;

// A person's walking for a plan: there, and on to their next item. A walk not known counts as none.
const walkOf = ({ walkMinutes, next }: Pick<PersonPart, 'walkMinutes' | 'next'>): number =>
  (walkMinutes ?? 0) + (next?.walkMinutes ?? 0);

// The walking a plan takes of everyone together, and the most any one of them walks.
export function walkingOf({ parts }: Pick<GatheringFit, 'parts'>): { total: number; most: number } {
  const walks = parts.map((part) => walkOf(part));
  return { total: walks.reduce((sum, minutes) => sum + minutes, 0), most: Math.max(0, ...walks) };
}

const byStartAndKey = (a: Fit, b: Fit): number =>
  a.start.getTime() - b.start.getTime() || (a.key < b.key ? -1 : Number(a.key > b.key));

const hurried = ({ togetherMinutes }: Fit): number => Number(togetherMinutes < UNHURRIED_MEAL_SECONDS / 60);

// Without the asker's origin their way there is not known, so walking cannot tell the plans apart: the earliest start,
// then the longest time to eat, then the name (P05 ticket 40).
const byStartAndSpan = (a: Fit, b: Fit): number =>
  a.start.getTime() - b.start.getTime() || b.togetherMinutes - a.togetherMinutes || byStartAndKey(a, b);

// The asker's origin is unknown: a later day with no item before the meal, and no location to fall back on.
const unplaced = ({ parts }: Fit): boolean => parts[0]?.origin === null;

// The walking that is known still counts first: the asker's on to their next item, and the Friends' ways.
function byLeastWalking(a: Fit, b: Fit): number {
  const [one, other] = [walkingOf(a), walkingOf(b)];
  const first = hurried(a) - hurried(b) || one.total - other.total;
  return first || (unplaced(a) ? byStartAndSpan(a, b) : one.most - other.most || byStartAndKey(a, b));
}

const byLongestTogether = (a: Fit, b: Fit): number => b.togetherMinutes - a.togetherMinutes || byStartAndKey(a, b);

export const PLAN_ORDERS: Record<PlanOrder, (a: Fit, b: Fit) => number> = {
  walking: byLeastWalking,
  together: byLongestTogether,
};

type OrderedPlan = Pick<Plan, 'id' | 'endAt' | 'togetherMinutes' | 'parts' | 'scene'>;

const clockOf = (at: string): string => at.slice(11, 16);

const UNHURRIED_MINUTES = UNHURRIED_MEAL_SECONDS / 60;

// The User's next item in words, "15:30 302동 수업", from the first plan's part and its mark on the map; null for none.
function nextItemWords({ scene }: OrderedPlan, { next }: Pick<PlanPart, 'next'>): string | null {
  if (next === null || next.place === null) {
    return null;
  }
  const isClass = scene.places.some(({ role, tag }) => role === 'next' && tag?.includes('수업') === true);
  return `${clockOf(next.startAt)} ${next.place.label}${isClass ? ' 수업' : ''}`;
}

// The walking a plan shows: everyone's way there, and the User's on to their next item.
function shownWalk({ parts, scene }: OrderedPlan): number {
  const there = parts.reduce((sum, { walkMinutes }) => sum + (walkMinutes ?? 0), 0);
  const me = parts.find((part) => part.me);
  const on = scene.routes.find(({ role, userId }) => role === 'next' && userId === me?.userId)?.minutes;
  return there + (on ?? 0);
}

// "302동식당과 301동식당은": the names, joined, and the topic.
function namesOf(plans: readonly OrderedPlan[]): string {
  const names = plans.map(({ id }) => id);
  const last = names.at(-1) ?? '';
  const before = names.slice(0, -1);
  const joined = before.length === 0 ? [] : [...before.slice(0, -1), withAnd(before.at(-1) ?? '')];
  return [...(joined.length === 0 ? [] : [joined.join(', ')]), withTopic(last)].join(' ');
}

// The plans with less walking than the first that its 30 minutes put after it, one sentence for each end, such as
// "302동식당과 301동식당은 13:30에 닫아 25분뿐이에요"; null when none.
function fellBackWords(plans: readonly OrderedPlan[]): string | null {
  const [first, ...rest] = plans;
  if (first === undefined || first.togetherMinutes < UNHURRIED_MINUTES) {
    return null;
  }
  const walk = shownWalk(first);
  const ends = new Map<string, OrderedPlan[]>();
  for (const plan of rest) {
    if (plan.togetherMinutes < UNHURRIED_MINUTES && shownWalk(plan) < walk) {
      const end = `${plan.endAt}|${plan.togetherMinutes}`;
      ends.set(end, [...(ends.get(end) ?? []), plan]);
    }
  }
  const sentences = [...ends.values()].flatMap((group) => {
    const [one] = group;
    if (one === undefined) {
      return [];
    }
    const leaving = one.parts.some(({ leaveBy }) => leaveBy === one.endAt);
    const why = leaving ? `${clockOf(one.endAt)}엔 나서야 해서` : `${clockOf(one.endAt)}에 닫아`;
    return [`${namesOf(group)} ${why} ${one.togetherMinutes}분뿐이에요`];
  });
  return sentences.length === 0 ? null : sentences.join(' ');
}

// What the model is told of the order when the User's origin is unknown, so that the reply never calls the first plan
// the nearest or the order 가까운 순서: the 30 minutes first, then the walk on to the User's next item, named by its
// time and Place, else the earliest start; and the nearer plans the 30 minutes put after the first, with why, in words
// to say. Nothing when the origin is known.
export function orderWords(plans: readonly OrderedPlan[]): { order?: string; fellBack?: string } {
  const [first] = plans;
  const me = first?.parts.find((part) => part.me);
  if (first === undefined || me === undefined || me.origin !== null) {
    return {};
  }
  const next = nextItemWords(first, me);
  const by =
    next === null
      ? 'the earliest start, then the longest time to eat'
      : `the least walking from the Restaurant on to the User's next item, ${next}`;
  const fellBack = fellBackWords(plans);
  return {
    order: `Not by nearness: where the User sets out from is not known. The plans where everyone has 30 minutes or more come first, then the shorter ones, and in each the order is by ${by}. Never call this order 가까운 순서.`,
    ...(fellBack === null ? {} : { fellBack }),
  };
}
