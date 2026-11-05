/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { ACCOUNT_AGE_DAYS, type Standing } from './alias-rules.js';

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

// The rows a count reads: the server reads them all; ticket 05's replay reads those before the time it replays to,
// less the labels it scores.
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
