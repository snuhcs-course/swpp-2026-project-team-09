/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { KeptQuest } from '@/api/assistant-types';
import { field, hasTexts, isText, isTextOrNull, listOf } from './answers';

// The checks of the User's Quests as the main server names them (P05 ticket 17).

const KINDS: ReadonlySet<unknown> = new Set(['meal-lunch', 'meal-dinner', 'meet', 'event', 'seat', 'other']);

const ANSWERS: ReadonlySet<unknown> = new Set(['leads', 'accepted', 'waiting', 'declined']);

function isPerson(value: unknown): value is KeptQuest['people'][number] {
  return isText(field(value, 'name')) && ANSWERS.has(field(value, 'answer'));
}

export function isKeptQuest(value: unknown): value is KeptQuest {
  return (
    KINDS.has(field(value, 'kind')) &&
    hasTexts(value, ['questId', 'title', 'startAt']) &&
    isTextOrNull(field(value, 'endAt')) &&
    isTextOrNull(field(value, 'place')) &&
    listOf(isPerson)(field(value, 'people')) &&
    typeof field(value, 'mine') === 'boolean' &&
    typeof field(value, 'changeable') === 'boolean'
  );
}

// Absent, as from a main server before P05 ticket 17, null, or one of them.
export function isKeptOneOrAbsent(value: unknown): boolean {
  return value === undefined || value === null || isKeptQuest(value);
}

// Absent, as from a main server before P05 ticket 17, or a list of them.
export function isKeptOrAbsent(value: unknown): boolean {
  return value === undefined || listOf(isKeptQuest)(value);
}
