/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReplyStep } from '@/api/assistant-types';
import { field, hasTexts, isNothing, isTextOrNull } from './answers';
import { isPlacePoint } from './plan-answers';

// Every kind of `ReplyStep`: the main server takes a Plan's from its answer's input, a study answer's "study" too.
const KINDS = new Set<unknown>(['seat', 'room', 'meal', 'meet', 'events', 'quests', 'new-quest', 'study']);

function isPlaceOrNull(value: unknown): boolean {
  return isNothing(value) || isPlacePoint(value);
}

function isShows(value: unknown): boolean {
  if (isNothing(value)) {
    return true;
  }
  const kind = field(value, 'kind');
  return kind === 'answer' || (kind === 'card' && hasTexts(value, ['key']));
}

// A step of a reply that answered several requests (P03).
export function isReplyStep(value: unknown): value is ReplyStep {
  const status = field(value, 'status');
  return (
    KINDS.has(field(value, 'kind')) &&
    hasTexts(value, ['title']) &&
    isPlaceOrNull(field(value, 'place')) &&
    isPlaceOrNull(field(value, 'from')) &&
    isTextOrNull(field(value, 'startAt')) &&
    isTextOrNull(field(value, 'endAt')) &&
    (status === 'shown' || status === 'not-done') &&
    isTextOrNull(field(value, 'reason')) &&
    isShows(field(value, 'shows'))
  );
}
