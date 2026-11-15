/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Lookup, LookupAction, LookupStep } from '@/api/lookup-types';
import { field, hasTexts, isText, isTextOrNull, listOf } from './answers';
import { isBand, isChip, isKeyOf, isLine, isPlacePoint, isScene } from './plan-answers';

// The app's check of a reply's Lookup, every field of it, as the answer screen draws each.

const isKind = isKeyOf<Lookup['kind']>({ way: true, friend: true, menu: true, day: true, tutorial: true });

function isStep(value: unknown): value is LookupStep {
  return isTextOrNull(field(value, 'at')) && isText(field(value, 'text'));
}

function isAction(value: unknown): value is LookupAction {
  switch (field(value, 'kind')) {
    case 'guide':
      return isPlacePoint(field(value, 'to'));
    case 'remind':
      return hasTexts(value, ['at', 'text']);
    case 'meet':
      return isText(field(value, 'userId'));
    default:
      return false;
  }
}

export function isLookup(value: unknown): value is Lookup {
  const band = field(value, 'band');
  const steps = field(value, 'steps');
  return (
    isKind(field(value, 'kind')) &&
    listOf(isChip)(field(value, 'chips')) &&
    listOf(isLine)(field(value, 'lines')) &&
    listOf(isText)(field(value, 'basis')) &&
    isScene(field(value, 'scene')) &&
    (band === null || isBand(band)) &&
    listOf(isAction)(field(value, 'actions')) &&
    (steps === undefined || listOf(isStep)(steps))
  );
}
