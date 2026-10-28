/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// When the words several Users chose a Place for become every User's alias (P07 ticket 03, scenario 4 plan §3.3). No
// precedent publishes its values (research note 07 §4): these are starting points, which ticket 05's replay tunes.

// Distinct accounts that chose the same Place for the same words: one account, or a pair of friends, cannot teach
// every User, and three is reachable at our number of Users. Accounts, not choices, are counted, as fake picks are the
// attack (research note 05 §4).
export const MIN_SUPPORTERS = 3;

// The Place's share of the accounts that chose anything for the words: words students use for two Places stay a
// question.
export const MIN_SHARE = 0.8;

// How old an account must be when it chooses for its choice to count, so that new accounts cannot be made to push
// words. An account's age is counted from its onboarding, the first moment it could use the Assistant.
export const ACCOUNT_AGE_DAYS = 7;

// The days over which an alias's score halves while it goes unused, as the precedents' 30-day windows.
export const HALF_LIFE_DAYS = 30;

// The score under which an alias is retired: half a supporter, so that decay retires an alias nobody uses (one of 3
// supporters after about 77 days unused) and not only rejections do. A new choice of its Place brings it back.
export const MIN_SCORE = 0.5;

const DAY_MS = 24 * 60 * 60 * 1000;

// What the choices and rejections of distinct accounts say of one Place for one words.
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

// The Place most accounts chose for the words, the only one that can be their alias: the fewest rejecters, then the id,
// break a tie.
export function topOf(standings: readonly Standing[]): Standing | undefined {
  return standings.toSorted(
    (a, b) => b.supporters - a.supporters || a.rejecters - b.rejecters || a.placeId.localeCompare(b.placeId),
  )[0];
}

// Whether a Place answers the words for every User: enough accounts chose it, it holds the share of all that chose for
// the words, and its score is at least MIN_SCORE. Otherwise its alias is retired.
export function qualifies(standing: Standing, allSupporters: number, score: number): boolean {
  return (
    standing.supporters >= MIN_SUPPORTERS && standing.supporters / allSupporters >= MIN_SHARE && score >= MIN_SCORE
  );
}
