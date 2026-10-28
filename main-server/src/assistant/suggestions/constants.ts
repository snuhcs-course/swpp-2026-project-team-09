/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The numbers of the grey suggestions, each with its reason. They are starting points: no precedent publishes its
// values, and the acceptance curves of `pnpm eval:suggestions` are what tune them.

export const TEMPLATES = [
  'lunch_with_free_friend',
  'route_to_next_class',
  'party_for_open_event',
  'repeat_last',
] as const;

export type Template = (typeof TEMPLATES)[number];

// The hand-set prior of each template: the User's own habit is the surest guess, and a route is asked for least.
export const BASE_WEIGHTS: Readonly<Record<Template, number>> = {
  lunch_with_free_friend: 1.0,
  route_to_next_class: 0.8,
  party_for_open_event: 1.0,
  repeat_last: 1.2,
};

// The least score that shows. With no impressions acceptance is 0.5, so every template shows at first.
export const THRESHOLD = 0.25;

// A wrong guess about a person costs more than one about a building, so a template that names a Friend needs more.
export const FRIEND_THRESHOLD = 0.35;

export const NAMES_A_FRIEND: ReadonlySet<Template> = new Set(['lunch_with_free_friend']);

// Laplace smoothing, one acceptance in two impressions before any is seen, so that a template with few is not
// silenced by its first dismissal.
export const PRIOR_ACCEPTED = 1;
export const PRIOR_SHOWN = 2;

// Long enough to gather a few hundred impressions a bucket at our traffic, short enough to follow a semester.
export const ACCEPTANCE_WINDOW_DAYS = 30;

// The acceptance a held-back account reads in place of the learned one: the prior's mean.
export const HOLDBACK_ACCEPTANCE = 0.5;

// Each organic repeat adds half the weight, up to four, so that a habit outranks the templates without drowning them.
export const REPEAT_STEP = 0.5;
export const REPEATS_MAX = 4;

// Two Quests the User led in two weeks at one Place and meal slot make a habit.
export const REPEAT_WINDOW_DAYS = 14;
export const REPEATS_MIN = 2;

// The share of impressions drawn uniformly among the templates above their threshold, so that the log holds the
// random traffic an offline replay needs; the rest show the top score.
export const EXPLORE = 0.1;

// Cooldowns after a dismissal, longer after the second of a day in Korea, and none shown after the third that day.
export const COOLDOWN_AFTER_FIRST_HOURS = 2;
export const COOLDOWN_AFTER_SECOND_HOURS = 6;
export const DISMISSALS_PER_DAY = 3;

// A 공강 started when a class ended this recently, or when the day's first class is further away than the next.
export const GONGANG_STARTED_WITHIN_MINUTES = 15;
export const FIRST_CLASS_AWAY_MINUTES = 60;

// A route is worth suggesting only when the next class is this close.
export const NEXT_CLASS_WITHIN_MINUTES = 60;

// Lunch is suggested from 11:00 to 14:00 in Korea.
export const LUNCH_FROM_MINUTES = 11 * 60;
export const LUNCH_UNTIL_MINUTES = 14 * 60;

// A suggested Quest starts at least this far ahead, so that there is time to make it and get there.
export const LEAD_MINUTES = 15;

// The capacities the spec fixes: the User and one Friend for lunch, a small group for an event.
export const LUNCH_CAPACITY = 2;
export const EVENT_CAPACITY = 3;

// The meal slots of repeat_last: 아침 before 10:30, 점심 from 10:30 to 14:30, 저녁 from 16:00. A Quest between 14:30 and
// 16:00 is in none.
export const BREAKFAST_UNTIL_MINUTES = 10 * 60 + 30;
export const LUNCH_SLOT_UNTIL_MINUTES = 14 * 60 + 30;
export const DINNER_FROM_MINUTES = 16 * 60;
