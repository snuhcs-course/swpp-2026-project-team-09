/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { eventLastsUntil, holdingPattern, timestamp, wordsHeld } from '../common/search-sql.js';
import { Prisma } from '../generated/prisma/client.js';

// What the Assistant's searchGlobalEvents asks for: the published events that overlap the period [from, to) when one is
// given, whose place holds `place`, ignoring case. `words` rank them and drop none.
export interface RankedSearch {
  period?: { from: Date; to: Date };
  place?: string;
  words?: readonly string[];
  // The most events answered.
  take: number;
}

// The ids of the events found that have not ended at `now`: those holding more of the words first, then in start order.
// Ties go by title in code points, which keeps Hangul in 가나다 order, so that every database gives the same list.
export async function rankedSearchIds(
  prisma: Pick<Prisma.TransactionClient, '$queryRaw'>,
  { period, place, words = [], take }: RankedSearch,
  now: Date,
): Promise<string[]> {
  const held = wordsHeld(words, Prisma.sql`e.title`, Prisma.sql`e.description`);
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT e.id
    FROM global_events e
    WHERE e.state = 'published'
      AND ${eventLastsUntil(now)}
      ${period === undefined ? Prisma.empty : Prisma.sql`AND e.starts_at < ${timestamp(period.to)} AND ${eventLastsUntil(period.from)}`}
      ${place === undefined ? Prisma.empty : Prisma.sql`AND e.place ILIKE ${holdingPattern(place)}`}
    ORDER BY ${held === null ? Prisma.empty : Prisma.sql`${held} DESC,`}
      e.starts_at ASC NULLS LAST, e.title COLLATE "C" ASC, e.id ASC
    LIMIT ${take}`;
  return rows.map(({ id }) => id);
}
