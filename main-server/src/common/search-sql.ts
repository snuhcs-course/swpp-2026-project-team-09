/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Prisma } from '../generated/prisma/client.js';
import { startOfSeoulDay } from './seoul-day.js';

// The pieces of SQL that the Assistant's two searches share: both filter and rank in the query, before the list is cut.

// The stored times have no time zone and are in UTC, which a bare date parameter would leave to the session's.
export const timestamp = (at: Date): Prisma.Sql => Prisma.sql`${at.toISOString()}::timestamp`;

// Whether the Global Event `e` has not ended at that moment. An event without an end lasts until the end of its start's
// day.
export function eventLastsUntil(at: Date): Prisma.Sql {
  return Prisma.sql`(e.ends_at > ${timestamp(at)} OR (e.ends_at IS NULL AND e.starts_at >= ${timestamp(startOfSeoulDay(at))}))`;
}

// A pattern for ILIKE, which Prisma's insensitive `contains` also uses, that finds the text as it is written.
export function holdingPattern(text: string): string {
  return `%${text.replaceAll(/[\\%_]/gu, String.raw`\$&`)}%`;
}

// Whether the Global Event `e` overlaps the period [from, to).
export function eventOverlaps({ from, to }: { from: Date; to: Date }): Prisma.Sql {
  return Prisma.sql`e.starts_at < ${timestamp(to)} AND ${eventLastsUntil(from)}`;
}

// The words, a word given twice counting once whatever its case, each as it was first given.
function distinctWords(words: readonly string[]): string[] {
  const firsts = new Map<string, string>();
  for (const word of words) {
    if (!firsts.has(word.toLowerCase())) {
      firsts.set(word.toLowerCase(), word);
    }
  }
  return [...firsts.values()];
}

// Each word with whether the title or the description holds it, ignoring case: what both ranks and tells the words a
// candidate matched.
function wordsHeld(
  words: readonly string[],
  title: Prisma.Sql,
  description: Prisma.Sql,
): { word: string; held: Prisma.Sql }[] {
  return distinctWords(words).map((word) => {
    const pattern = holdingPattern(word.toLowerCase());
    return { word, held: Prisma.sql`(${title} ILIKE ${pattern} OR ${description} ILIKE ${pattern})` };
  });
}

// The start of an ORDER BY: those whose title or description holds more of the words first. Nothing without words.
export function moreWordsFirst(words: readonly string[], title: Prisma.Sql, description: Prisma.Sql): Prisma.Sql {
  const each = wordsHeld(words, title, description);
  if (each.length === 0) {
    return Prisma.empty;
  }
  return Prisma.sql`(${Prisma.join(
    each.map(({ held }) => Prisma.sql`${held}::int`),
    ' + ',
  )}) DESC,`;
}

// A text[] column of the words that the title or description holds, by the same test that ranks them, in their order.
export function wordsMatched(words: readonly string[], title: Prisma.Sql, description: Prisma.Sql): Prisma.Sql {
  const each = wordsHeld(words, title, description);
  if (each.length === 0) {
    return Prisma.sql`ARRAY[]::text[]`;
  }
  return Prisma.sql`array_remove(ARRAY[${Prisma.join(
    each.map(({ word, held }) => Prisma.sql`CASE WHEN ${held} THEN ${word}::text END`),
  )}], NULL)`;
}

// How a candidate found in the window falls in it: 'starts' when `start` is in it, 'underWay' when it began before and
// overlaps it, as the search found it. NULL without a window.
export function windowOfStart(start: Prisma.Sql, window: { from: Date } | undefined): Prisma.Sql {
  return window === undefined
    ? Prisma.sql`NULL::text`
    : Prisma.sql`CASE WHEN ${start} < ${timestamp(window.from)} THEN 'underWay' ELSE 'starts' END`;
}

// Why a search found a candidate: the words it holds, and how it falls in the window, null without one.
export interface Hit {
  id: string;
  matched: string[];
  window: 'starts' | 'underWay' | null;
}

// How many candidates a search found before it was cut, and how many of them are on each Board, start on each day in
// Asia/Seoul and hold each word. A candidate without a start is on no day.
export interface SearchCounts {
  total: number;
  board: Record<string, number>;
  day: Record<string, number>;
  word: Record<string, number>;
}

// The counts of every row of `found`, which selects the columns board, start (a stored time) and matched (wordsMatched
// of `words`).
export async function countsOf(
  prisma: Pick<Prisma.TransactionClient, '$queryRaw'>,
  found: Prisma.Sql,
  words: readonly string[],
): Promise<SearchCounts> {
  const [counts] = await prisma.$queryRaw<[{ total: number } & Omit<SearchCounts, 'total'>]>`
    WITH found AS (${found})
    SELECT
      (SELECT count(*)::int FROM found) AS total,
      (SELECT COALESCE(json_object_agg(board, n), '{}') FROM (
        SELECT board, count(*)::int AS n FROM found WHERE board IS NOT NULL GROUP BY board ORDER BY board
      ) b) AS board,
      (SELECT COALESCE(json_object_agg(day, n), '{}') FROM (
        SELECT to_char(start AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS day, count(*)::int AS n
        FROM found WHERE start IS NOT NULL GROUP BY day ORDER BY day
      ) d) AS day,
      (SELECT COALESCE(json_object_agg(word, n), '{}') FROM (
        SELECT word, count(*)::int AS n FROM found, unnest(matched) AS word GROUP BY word
      ) w) AS word`;
  const { total, board, day, word } = counts;
  return {
    total,
    board,
    day,
    word: Object.fromEntries(distinctWords(words).map((each) => [each, word[each] ?? 0])),
  };
}
