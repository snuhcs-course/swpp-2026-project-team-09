/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Lookup } from '@/api/lookup-types';
import { isLookup } from '@/api/server/lookup-answers';
import friendCopies from './friend-taps.json';
import copies from './tap-lookups.json';

// The main server's cards of a press on the map, written by its `placeAnswer` and `friendTap` over the seed's Places
// and walking table.

function checked(value: unknown): Lookup {
  if (!isLookup(value)) {
    throw new Error('A stored card fails the check of a reply');
  }
  return value;
}

// The buildings of wireframe row 6, by board, with the User's and 김민수's ids those of `meal-answer.ts`. On Tuesday
// 2026-11-17 at 12:10 the User stands in 301동 after a Class there, with the next at 13:00 in 24동: 63동 with
// 학생회관식당's lunch (a1), 39동 (a3), and 302동 with 302동식당's lunch and 김민수 in it (a14). On Friday 2026-11-20
// at 13:50, after a Class in 24동, 73동 with the job fair and the company session of `events-answer.ts` (a2).
export const TAP_LOOKUPS = {
  a1: checked(copies.a1),
  a2: checked(copies.a2),
  a3: checked(copies.a3),
  a14: checked(copies.a14),
};

// The faces of the mock's Friends (`friends.ts`), by id, at the frame's moment, Thursday 2026-10-01 at 13:37, the User
// setting out from 302동 after their Class there. Each Friend is at the Place their status names, with Classes at the
// times it gives; 서지우 and 신예린 show the User their Timetable only.
export const FRIEND_TAPS: Readonly<Record<string, Lookup>> = Object.fromEntries(
  Object.entries(friendCopies).map(([id, copy]) => [id, checked(copy)]),
);

// 김민준's card, which the mock gives for an id that is none of its Friends, as no card of that person is stored.
export const STAND_IN_FRIEND_TAP = checked(friendCopies.f1);
