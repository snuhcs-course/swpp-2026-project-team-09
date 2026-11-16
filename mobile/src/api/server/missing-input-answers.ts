/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerOffer, REFUSAL_SCREENS, type WithMissing } from '@/api/refusal-types';
import { field, isText, listOf } from './answers';

// The app's check of what an answer or a Lookup says when an input was missing (P02-13), each part left out by a main
// server before it.

function isAnswerOffer(value: unknown): value is AnswerOffer {
  const screen = field(value, 'screen');
  return (
    field(value, 'kind') === 'open' && isText(field(value, 'label')) && REFUSAL_SCREENS.some((one) => one === screen)
  );
}

export function isNote(value: unknown): value is string | undefined {
  return value === undefined || isText(value);
}

export function hasMissingParts(value: unknown): value is WithMissing {
  const offers = field(value, 'offers');
  return (offers === undefined || listOf(isAnswerOffer)(offers)) && isNote(field(value, 'note'));
}
