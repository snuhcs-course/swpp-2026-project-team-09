/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import {
  countsOf,
  eventLastsUntil,
  eventOverlaps,
  type Hit,
  holdingPattern,
  moreWordsFirst,
  type SearchCounts,
  windowOfStart,
  wordsMatched,
} from '../common/search-sql.js';
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

// The rows of the events found that have not ended at `now`, from FROM to WHERE.
function foundFrom({ period, place }: Omit<RankedSearch, 'take'>, now: Date): Prisma.Sql {
  return Prisma.sql`FROM global_events e
    WHERE e.state = 'published'
      AND ${eventLastsUntil(now)}
      ${period === undefined ? Prisma.empty : Prisma.sql`AND ${eventOverlaps(period)}`}
      ${place === undefined ? Prisma.empty : Prisma.sql`AND e.place ILIKE ${holdingPattern(place)}`}`;
}

// The events found, with why: those holding more of the words first, then in start order. Ties go by title in code
// points, which keeps Hangul in 가나다 order, so that every database gives the same list.
export function rankedSearchHits(
  prisma: Pick<Prisma.TransactionClient, '$queryRaw'>,
  search: RankedSearch,
  now: Date,
): Promise<Hit[]> {
  const { period, words = [], take } = search;
  return prisma.$queryRaw<Hit[]>`
    SELECT e.id, ${wordsMatched(words, Prisma.sql`e.title`, Prisma.sql`e.description`)} AS matched,
      ${windowOfStart(Prisma.sql`e.starts_at`, period)} AS "window"
    ${foundFrom(search, now)}
    ORDER BY ${moreWordsFirst(words, Prisma.sql`e.title`, Prisma.sql`e.description`)}
      e.starts_at ASC NULLS LAST, e.title COLLATE "C" ASC, e.id ASC
    LIMIT ${take}`;
}

// The counts of every event the search finds, uncut. Events have no Board.
export function rankedSearchCounts(
  prisma: Pick<Prisma.TransactionClient, '$queryRaw'>,
  search: Omit<RankedSearch, 'take'>,
  now: Date,
): Promise<SearchCounts> {
  const { words = [] } = search;
  return countsOf(
    prisma,
    Prisma.sql`SELECT NULL::text AS board, e.starts_at AS start,
      ${wordsMatched(words, Prisma.sql`e.title`, Prisma.sql`e.description`)} AS matched
    ${foundFrom(search, now)}`,
    words,
  );
}
