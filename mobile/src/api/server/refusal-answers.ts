/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { REFUSAL_KINDS, REFUSAL_SCREENS, type Refusal, type RefusalOffer } from '@/api/refusal-types';
import { field, hasTexts, isTextOrNull, listOf } from './answers';
import { isLine } from './plan-answers';
import { isOneOf } from './plan-inputs';

// The app's check of a reply's refusal, every field of it, as the answer frame draws each.

function isOffer(value: unknown): value is RefusalOffer {
  switch (field(value, 'kind')) {
    case 'ask':
      return hasTexts(value, ['label', 'text']);
    case 'open':
      return hasTexts(value, ['label']) && isOneOf(REFUSAL_SCREENS)(field(value, 'screen'));
    case 'pick-friend':
      return hasTexts(value, ['userId', 'label', 'text']) && isTextOrNull(field(value, 'aside'));
    default:
      return false;
  }
}

export function isRefusal(value: unknown): value is Refusal {
  return (
    isOneOf(REFUSAL_KINDS)(field(value, 'kind')) &&
    listOf(isLine)(field(value, 'lines')) &&
    listOf(isOffer)(field(value, 'offers'))
  );
}
