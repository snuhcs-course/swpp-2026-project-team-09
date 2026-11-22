/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { UNHURRIED_MEAL_SECONDS } from '../../travel/judgement-constants.js';
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

function byLeastWalking(a: Fit, b: Fit): number {
  const [one, other] = [walkingOf(a), walkingOf(b)];
  return hurried(a) - hurried(b) || one.total - other.total || one.most - other.most || byStartAndKey(a, b);
}

const byLongestTogether = (a: Fit, b: Fit): number => b.togetherMinutes - a.togetherMinutes || byStartAndKey(a, b);

export const PLAN_ORDERS: Record<PlanOrder, (a: Fit, b: Fit) => number> = {
  walking: byLeastWalking,
  together: byLongestTogether,
};
