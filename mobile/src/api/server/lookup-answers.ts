/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { CardFact, Lookup, LookupAction, LookupCard, LookupStep } from '@/api/lookup-types';
import { field, hasTexts, isText, isTextOrNull, listOf } from './answers';
import { isChip } from './chip-answers';
import { isNote } from './missing-input-answers';
import { isBand, isKeyOf, isLine, isPlacePoint, isScene } from './plan-answers';
import { isInput, isOneOf } from './plan-inputs';

// The app's check of a reply's Lookup, every field of it, as the answer screen draws each.

const isKind = isKeyOf<Lookup['kind']>({ way: true, friend: true, menu: true, place: true, day: true, tutorial: true });

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

// An asked Lookup has no card, and a main server before P01-17 sends none.
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
    isNote(field(value, 'note'))
  );
}
