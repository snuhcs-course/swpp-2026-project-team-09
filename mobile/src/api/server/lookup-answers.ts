/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { CardFact, Lookup, LookupAction, LookupCard, LookupStep } from '@/api/lookup-types';
import { field, hasTexts, isText, isTextOrNull, listOf } from './answers';
import { isChip } from './chip-answers';
import { isNote } from './missing-input-answers';
import { isKeptOrAbsent } from './kept-answers';
import { isBand, isDish, isKeyOf, isLine, isPlacePoint, isScene } from './plan-answers';
import { isInput, isOneOf } from './plan-inputs';

// The app's check of a reply's Lookup, every field of it, as the answer screen draws each.

const isKind = isKeyOf<Lookup['kind']>({
  way: true,
  friend: true,
  menu: true,
  place: true,
  day: true,
  tutorial: true,
  study: true,
});

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
    case 'plan':
      return isText(field(value, 'label')) && isInput(field(value, 'input'));
    case 'ask':
      return hasTexts(value, ['label', 'text']);
    default:
      return false;
  }
}

const isIcon = isOneOf<CardFact['icon']>(['route', 'clock', 'meal', 'flag', 'user', 'pin', 'lock', 'calendar']);

function isFact(value: unknown): value is CardFact {
  return (
    isIcon(field(value, 'icon')) &&
    isText(field(value, 'text')) &&
    typeof field(value, 'strong') === 'boolean' &&
    isTextOrNull(field(value, 'userId'))
  );
}

function isCard(value: unknown): value is LookupCard {
  return (
    isText(field(value, 'title')) &&
    isTextOrNull(field(value, 'subtitle')) &&
    listOf(isFact)(field(value, 'facts')) &&
    isTextOrNull(field(value, 'note'))
  );
}

// A menu Lookup's facts: absent, or the hours (both "HH:MM", or null) and the dishes.
function isMenuOrAbsent(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }
  const hours = field(value, 'hours');
  return (
    (hours === null || (isText(field(hours, 'opensAt')) && isText(field(hours, 'closesAt')))) &&
    listOf(isDish)(field(value, 'dishes'))
  );
}

// An asked Lookup has no card, and a main server before P01-17 sends none.
// A menu question's Restaurant that cannot be done now (P04 ticket 72), absent from any other Lookup.
function isMenuViewOrAbsent(value: unknown): boolean {
  return (
    value === undefined ||
    (hasTexts(value, ['restaurant', 'date', 'why']) &&
      (field(value, 'meal') === 'lunch' || field(value, 'meal') === 'dinner'))
  );
}

export function isLookup(value: unknown): value is Lookup {
  const band = field(value, 'band');
  const card = field(value, 'card');
  const steps = field(value, 'steps');
  return (
    isKind(field(value, 'kind')) &&
    listOf(isChip)(field(value, 'chips')) &&
    listOf(isLine)(field(value, 'lines')) &&
    listOf(isText)(field(value, 'basis')) &&
    isScene(field(value, 'scene')) &&
    (band === null || isBand(band)) &&
    listOf(isAction)(field(value, 'actions')) &&
    (card === undefined || card === null || isCard(card)) &&
    (steps === undefined || listOf(isStep)(steps)) &&
    isNote(field(value, 'note')) &&
    isMenuOrAbsent(field(value, 'menu')) &&
    isKeptOrAbsent(field(value, 'kept')) &&
    (field(value, 'fact') === undefined || field(value, 'fact') === true) &&
    isMenuViewOrAbsent(field(value, 'menuView'))
  );
}
