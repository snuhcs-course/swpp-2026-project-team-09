/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply } from '@/api/assistant-types';
import type { Lookup } from '@/api/lookup-types';
import { isLookup } from '@/api/server/lookup-answers';
import copy from './day-lookup.json';

// The main server's Lookup for "오늘 수업 뭐 있어?", asked on Tuesday 2026-11-17 at 10:30 with Classes in 301동, 24동,
// and 58동, copied whole, with the User's id that of `meal-answer.ts`.

function checked(value: unknown): Lookup {
  if (!isLookup(value)) {
    throw new Error('The stored Lookup fails the check of a reply');
  }
  return value;
}

export const DAY_LOOKUP = checked(copy);

export const DAY_LOOKUP_REPLY: AssistantReply & { lookup: Lookup } = {
  text: '오늘 수업은 3개예요.',
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: null,
  lookup: DAY_LOOKUP,
};
