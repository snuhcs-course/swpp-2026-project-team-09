/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MenuDish } from '@/api/assistant-types';
import { field, isNumber, isText, listOf } from './answers';
import { isOneOf } from './plan-inputs';

// The checks of a meal Plan's menu and a menu Lookup's dishes (moved out of `plan-answers.ts` for its length).

const isCuisine = isOneOf(['한식', '중식', '일식', '양식', '분식']);

const isNumberOrNull = (value: unknown): value is number | null => value === null || isNumber(value);

export function isDish(value: unknown): value is MenuDish {
  const cuisine = field(value, 'cuisine');
  return (
    isText(field(value, 'name')) &&
    isNumberOrNull(field(value, 'price')) &&
    (cuisine === undefined || cuisine === null || isCuisine(cuisine))
  );
}

// A meal Plan's menu: absent when none was collected there, and its count of the other things served absent from a
// main server before P04 ticket 74.
export function isPlanMenuOrAbsent(value: unknown): boolean {
  const others = field(value, 'others');
  return (
    value === undefined ||
    (isNumberOrNull(field(value, 'price')) &&
      listOf(isDish)(field(value, 'dishes')) &&
      (others === undefined || isNumber(others)))
  );
}
