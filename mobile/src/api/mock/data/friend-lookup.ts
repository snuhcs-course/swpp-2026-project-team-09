/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Lookup } from '@/api/assistant-types';
import { isLookup } from '@/api/server/plan-answers';
import copy from './friend-lookup.json';

// The main server's Lookup for "민수 어디야?", asked on Tuesday 2026-11-17 at 12:05 while 민수, in his Class in 302동
// until 12:15, shows the User the building he is in, copied whole, with 민수's id that of `meal-answer.ts`.

function checked(value: unknown): Lookup {
  if (!isLookup(value)) {
    throw new Error('The stored Lookup fails the check of a reply');
  }
  return value;
}

export const FRIEND_LOOKUP = checked(copy);
