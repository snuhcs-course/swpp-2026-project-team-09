/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Cuisine } from '../generated/prisma/client.js';

// A dish's kind of food, in the words a student uses. The few kinds are the chips the app offers; any other is none.
export const CUISINE_WORD_LIST = ['한식', '중식', '일식', '양식', '분식'] as const;

export type CuisineWord = (typeof CUISINE_WORD_LIST)[number];

// What a dish's kinds of food are known by: its name, as dishName gives it.
export type Cuisines = ReadonlyMap<string, CuisineWord | null>;

export const CUISINE_WORDS: Record<Cuisine, CuisineWord> = {
  korean: '한식',
  chinese: '중식',
  japanese: '일식',
  western: '양식',
  snack: '분식',
};
