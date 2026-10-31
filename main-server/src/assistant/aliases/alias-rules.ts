/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

// When the words several Users led to a Place become every User's alias (P07 tickets 03 and 06, scenario 4 plan
// §3.3). No precedent publishes its values (research note 07 §4): these are starting points, which ticket 05's replay
// tunes.

// Distinct accounts whose successful session with the words reached the same Place: one account, or a pair of
// friends, cannot teach every User, and three is reachable at our number of Users. Accounts, not choices, are counted,
// as fake picks are the attack (research note 05 §4). The paper of ticket 06 keeps such a "minimum number of
// customers" and withholds its value.
export const MIN_SUPPORTERS = 3;

// The Place's share of the reach from the words' own reading, over every Place reached but the reading itself: words
// students use for two Places stay a question.
export const MIN_SHARE = 0.8;

// How old an account must be at a session's start for the session to teach, so that new accounts cannot be made to
// push words. An account's age is counted from its onboarding, the first moment it could use the Assistant.
export const ACCOUNT_AGE_DAYS = 7;

// The days over which an alias's score halves while it goes unused, as the precedents' 30-day windows.
export const HALF_LIFE_DAYS = 30;

// The score under which an alias is retired: half a supporter, so that decay retires an alias nobody uses (one of 3
// supporters after about 77 days unused) and not only rejections do. A new choice of its Place brings it back.
export const MIN_SCORE = 0.5;

// One account's Place events at most this far apart are one session (ticket 06, the paper's δτ). The paper cuts spoken
// turns at 45 seconds; a chat turn holds the model's reply and the User's reading and typing.
export const SESSION_GAP_MINUTES = 5;

// Rows older than this teach nothing: the paper mines three months of logs.
export const CHAIN_WINDOW_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

// What the sessions and rejections of distinct accounts say of one Place for one words.
export interface Standing {
  placeId: string;
  supporters: number;
  rejecters: number;
}

// The supporters less the rejecters, halved for every 30 days since the alias last answered.
export function scoreOf({ supporters, rejecters }: Standing, lastUsedAt: Date, now: Date): number {
  const days = Math.max(0, now.getTime() - lastUsedAt.getTime()) / DAY_MS;
  return (supporters - rejecters) * 0.5 ** (days / HALF_LIFE_DAYS);
}
