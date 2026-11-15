/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply } from '@/api/assistant-types';
import type { Lookup } from '@/api/lookup-types';
import { isLookup } from '@/api/server/lookup-answers';
import copy from './menu-lookup.json';

// The main server's Lookup for "오늘 301동식당 메뉴 뭐야?", asked on Tuesday 2026-11-17 at 11:40 in a Class in 301동
// until 11:50, over the menus collected on 2026-10-01, copied whole, with the User's id that of `meal-answer.ts`.

function checked(value: unknown): Lookup {
  if (!isLookup(value)) {
    throw new Error('The stored Lookup fails the check of a reply');
  }
  return value;
}

export const MENU_LOOKUP = checked(copy);

export const MENU_LOOKUP_REPLY: AssistantReply & { lookup: Lookup } = {
  text: '301동식당 오늘 점심은 부대짬뽕&군만두예요.',
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: null,
  lookup: MENU_LOOKUP,
};
