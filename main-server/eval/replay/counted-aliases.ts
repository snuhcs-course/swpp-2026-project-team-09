/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import {
  ACCOUNT_AGE_DAYS,
  MIN_SCORE,
  MIN_SHARE,
  MIN_SUPPORTERS,
  type Standing,
} from '../../src/assistant/aliases/alias-rules.js';
import { Prisma, type PrismaClient } from '../../src/generated/prisma/client.js';

// Ticket 03's count rule, the baseline stage C measures the alias chain against (P07 ticket 06): each Place's standing
// for the words from the labels alone, and the top Place promoted on the same supporters, share and score. The server
// no longer learns by it.

// One Place's standing for the words, or with no Place the count of every account that chose anything for them.
interface StandingRow {
  placeId: string | null;
  supporters: number;
  rejecters: number;
}

export interface Standings {
  standings: Standing[];
  // The accounts that chose anything for the words, the share's denominator.
  allSupporters: number;
}

// The rows a count reads: those before the time it replays to, less the labels it scores.
export interface StandingsWindow {
  before?: Date;
  excluding?: readonly string[];
}

// Each Place's standing for the words from resolution_events, in one query, and how many accounts chose anything for
// them. Supporters are distinct accounts that were old enough when they chose, so an account counts once for the
// words and a Place however often it chooses; rejecters are distinct accounts that said 아니에요 to it. Only Places
// still in the catalog are counted.
export async function standingsOf(
  prisma: PrismaClient,
  words: string,
  { before, excluding = [] }: StandingsWindow = {},
): Promise<Standings> {
  // created_at holds the time in UTC without a zone, so the bound is read as UTC whatever the session's zone.
  const beforeBound =
    before === undefined
      ? Prisma.empty
      : Prisma.sql`AND e.created_at < (${before.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
  const excluded = excluding.length === 0 ? Prisma.empty : Prisma.sql`AND e.id <> ALL(${excluding}::uuid[])`;
  const rows = await prisma.$queryRaw<StandingRow[]>`
      SELECT e.chosen_id AS "placeId",
        (count(DISTINCT e.user_id) FILTER (
          WHERE e.outcome <> 'rejected'
            AND e.created_at >= u.onboarded_at + make_interval(days => ${ACCOUNT_AGE_DAYS}::int)
        ))::int AS supporters,
        (count(DISTINCT e.user_id) FILTER (WHERE e.outcome = 'rejected'))::int AS rejecters
      FROM resolution_events e
      JOIN users u ON u.id = e.user_id
      WHERE e.kind = 'place'
        AND e.words = ${words}
        AND e.outcome IN ('chosen', 'edited', 'rejected')
        AND e.chosen_id IN (SELECT id FROM places)
        ${beforeBound}
        ${excluded}
      GROUP BY GROUPING SETS ((e.chosen_id), ())`;
  return {
    standings: rows.flatMap(({ placeId, supporters, rejecters }): Standing[] =>
      placeId === null ? [] : [{ placeId, supporters, rejecters }],
    ),
    allSupporters: rows.find(({ placeId }) => placeId === null)?.supporters ?? 0,
  };
}

// The Place most accounts chose for the words, the only one that can be their alias: the fewest rejecters, then the id,
// break a tie.
export function topOf(standings: readonly Standing[]): Standing | undefined {
  return standings.toSorted(
    (a, b) => b.supporters - a.supporters || a.rejecters - b.rejecters || a.placeId.localeCompare(b.placeId),
  )[0];
}

// Whether a Place answers the words for every User by the count: enough accounts chose it, it holds the share of all
// that chose for the words, and its score is at least MIN_SCORE.
export function qualifies(standing: Standing, allSupporters: number, score: number): boolean {
  return (
    standing.supporters >= MIN_SUPPORTERS && standing.supporters / allSupporters >= MIN_SHARE && score >= MIN_SCORE
  );
}
