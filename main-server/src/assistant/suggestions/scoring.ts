/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  BASE_WEIGHTS,
  COOLDOWN_AFTER_FIRST_HOURS,
  COOLDOWN_AFTER_SECOND_HOURS,
  DISMISSALS_PER_DAY,
  EXPLORE,
  FRIEND_THRESHOLD,
  HOLDBACK_ACCEPTANCE,
  NAMES_A_FRIEND,
  PRIOR_ACCEPTED,
  PRIOR_SHOWN,
  REPEAT_STEP,
  REPEATS_MAX,
  type Template,
  THRESHOLD,
} from './constants.js';
import { koreaAt, koreaMidnight } from './korea-day.js';

// score = weight × acceptance × (1 + 0.5 × min(repeats, 4)) × fatigue, which shows when it reaches the template's
// threshold, and the draw among those that do.

export type Bucket = 'morning' | 'midday' | 'afternoon' | 'evening';

// The time of day in Korea whose acceptance is read: 05–11, 11–14, 14–18 and 18–05.
export function bucketOf(minutes: number): Bucket {
  const hour = Math.floor(minutes / 60);
  if (hour >= 5 && hour < 11) {
    return 'morning';
  }
  if (hour >= 11 && hour < 14) {
    return 'midday';
  }
  return hour >= 14 && hour < 18 ? 'afternoon' : 'evening';
}

// A template's impressions in the bucket over the window, of all Users: accepted counts a later confirmation too.
export interface Impressions {
  shown: number;
  accepted: number;
}

export function acceptanceOf({ shown, accepted }: Impressions): number {
  return (accepted + PRIOR_ACCEPTED) / (shown + PRIOR_SHOWN);
}

export interface ScoreInput {
  template: Template;
  impressions: Impressions;
  // The User's own count behind repeat_last, 0 for the others.
  repeats: number;
  fatigue: number;
  // A held-back account reads the prior's acceptance and no repeats.
  holdback: boolean;
}

export function scoreOf({ template, impressions, repeats, fatigue, holdback }: ScoreInput): number {
  const acceptance = holdback ? HOLDBACK_ACCEPTANCE : acceptanceOf(impressions);
  const counted = holdback ? 0 : Math.min(repeats, REPEATS_MAX);
  return BASE_WEIGHTS[template] * acceptance * (1 + REPEAT_STEP * counted) * fatigue;
}

export function thresholdOf(template: Template): number {
  return NAMES_A_FRIEND.has(template) ? FRIEND_THRESHOLD : THRESHOLD;
}

// Which of `count` templates above their threshold, the best first, shows, and the probability it had: the top with
// 0.9, else one drawn uniformly, so that the top has 0.9 + 0.1 / n and each other 0.1 / n.
export function draw(count: number, random: () => number): { index: number; propensity: number } {
  const explore = random() < EXPLORE;
  const index = explore ? Math.min(Math.floor(random() * count), count - 1) : 0;
  return { index, propensity: index === 0 ? 1 - EXPLORE + EXPLORE / count : EXPLORE / count };
}

const HOUR_MS = 60 * 60 * 1000;

// When the dismissals stop holding suggestions back: the first of a day in Korea for 2 hours, the second for 6, and
// the third and later until the day ends. Null when none holds them back now.
export function cooldownUntil(now: Date, dismissedAt: readonly Date[]): Date | null {
  const sorted = dismissedAt.toSorted((a, b) => a.getTime() - b.getTime());
  const ends = sorted.map((at, index) => {
    const day = koreaMidnight(at).getTime();
    const ofTheDay = sorted.slice(0, index + 1).filter((earlier) => koreaMidnight(earlier).getTime() === day).length;
    if (ofTheDay >= DISMISSALS_PER_DAY) {
      return koreaAt(at, 0, 1);
    }
    const hours = ofTheDay === 1 ? COOLDOWN_AFTER_FIRST_HOURS : COOLDOWN_AFTER_SECOND_HOURS;
    return new Date(at.getTime() + hours * HOUR_MS);
  });
  const latest = ends.filter((end) => end > now).toSorted((a, b) => b.getTime() - a.getTime())[0];
  return latest ?? null;
}

// 0 during a cooldown, 1 otherwise.
export function fatigueAt(now: Date, dismissedAt: readonly Date[]): number {
  return cooldownUntil(now, dismissedAt) === null ? 1 : 0;
}
