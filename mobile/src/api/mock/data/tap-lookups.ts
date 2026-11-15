/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Lookup } from '@/api/lookup-types';
import { isLookup } from '@/api/server/lookup-answers';
import copies from './tap-lookups.json';

// The main server's cards of wireframe row 6, by board, written by its `placeAnswer` and `friendTap` over the seed's
// Places and walking table, with the User's and 김민수's and 김지은's ids those of `meal-answer.ts`. On Tuesday
// 2026-11-17 at 12:10 the User stands in 301동 after a Class there, with the next at 13:00 in 24동: 63동 with
// 학생회관식당's lunch (a1), 39동 (a3), 302동 with 302동식당's lunch and 김민수 in it (a14), and the faces of 김민수 at
// the building (a4), 김지은 at her exact location (a13), and 박서준 at the Timetable only (a10). On Friday 2026-11-20
// at 13:50, after a Class in 24동, 73동 with the job fair and the company session of `events-answer.ts` (a2).

function checked(value: unknown): Lookup {
  if (!isLookup(value)) {
    throw new Error('A stored card fails the check of a reply');
  }
  return value;
}

export const TAP_LOOKUPS = {
  a1: checked(copies.a1),
  a2: checked(copies.a2),
  a3: checked(copies.a3),
  a14: checked(copies.a14),
  a4: checked(copies.a4),
  a13: checked(copies.a13),
  a10: checked(copies.a10),
};
