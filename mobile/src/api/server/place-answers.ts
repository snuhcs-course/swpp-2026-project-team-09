/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlacePoint } from '@/api/assistant-types';
import type { ClosedPlace } from '@/api/plan-part-types';
import type { LatLng } from '@/api/types';
import { field, hasTexts, isNumber, isText, listOf } from './answers';

// The checks of a Place in an answer (moved out of `plan-answers.ts` for its length).

export function isLatLng(value: unknown): value is LatLng {
  return isNumber(field(value, 'latitude')) && isNumber(field(value, 'longitude'));
}

export function isPlacePoint(value: unknown): value is PlacePoint {
  return hasTexts(value, ['placeId', 'label']) && isLatLng(value);
}

const isClosed = (value: unknown): value is ClosedPlace =>
  isPlacePoint(field(value, 'place')) && listOf(isText)(field(value, 'notices'));

// A meal answer's Restaurants closed for the meal: absent when none, from other answers, and from a main server before
// P04 ticket 71.
export function isClosedOrAbsent(value: unknown): value is ClosedPlace[] | undefined {
  return value === undefined || listOf(isClosed)(value);
}
