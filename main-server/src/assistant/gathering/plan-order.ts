/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { UNHURRIED_MEAL_SECONDS } from '../../travel/judgement-constants.js';
import { type PlanPart } from '../dto/answer.dto.js';
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

// What the model is told of the order when the User's origin is unknown, so that the reply never calls the first plan
// the nearest: by the walk on to the User's next item when one follows, else by the earliest start. Nothing otherwise.
export function orderWords(plans: readonly { parts: readonly Pick<PlanPart, 'me' | 'origin' | 'next'>[] }[]): {
  order?: string;
} {
  const me = plans[0]?.parts.find((part) => part.me);
  if (me === undefined || me.origin !== null) {
    return {};
  }
  const by =
    me.next === null || me.next.place === null
      ? 'the earliest start, then the longest time to eat'
      : `the least walking on to the User's next item at ${me.next.place.label}`;
  return {
    order: `Not by nearness: where the User sets out from is not known, so the plans are ordered by ${by}.`,
  };
}
