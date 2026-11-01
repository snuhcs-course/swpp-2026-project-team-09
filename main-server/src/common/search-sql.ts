/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
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

// How many of the words the title or the description holds, ignoring case; a word given twice counts once. Null without
// words: ORDER BY reads a bare number as a column's position.
export function wordsHeld(words: readonly string[], title: Prisma.Sql, description: Prisma.Sql): Prisma.Sql | null {
  const distinct = [...new Set(words.map((word) => word.toLowerCase()))];
  if (distinct.length === 0) {
    return null;
  }
  const each = distinct.map((word) => {
    const pattern = holdingPattern(word);
    return Prisma.sql`(${title} ILIKE ${pattern} OR ${description} ILIKE ${pattern})::int`;
  });
  return Prisma.sql`(${Prisma.join(each, ' + ')})`;
}
