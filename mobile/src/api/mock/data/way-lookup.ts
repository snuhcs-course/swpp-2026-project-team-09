/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply, Lookup } from '@/api/assistant-types';
import { isLookup } from '@/api/server/plan-answers';
import copy from './way-lookup.json';

// The main server's Lookup for "문화관이 어디야?", asked on Tuesday 2026-11-17 at 11:50 at 301동, copied whole, with the
// User's id that of `meal-answer.ts`.

function checked(value: unknown): Lookup {
  if (!isLookup(value)) {
    throw new Error('The stored Lookup fails the check of a reply');
  }
  return value;
}

export const WAY_LOOKUP = checked(copy);

export const WAY_LOOKUP_REPLY: AssistantReply & { lookup: Lookup } = {
  text: '문화관은 지금 있는 301동에서 걸어서 18분이에요.',
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: null,
  lookup: WAY_LOOKUP,
};
