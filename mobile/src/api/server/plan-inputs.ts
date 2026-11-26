/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { EventsInput, MealInput, PersonConstraint, PlanInput, PlanPerson } from '@/api/assistant-types';
import type { MeetInput } from '@/api/meet-plan-types';
import type { NewQuestInput, QuestsInput } from '@/api/recruiting-plan-types';
import { field, isBoard, isText, isTextOrNull, listOf } from './answers';
import { hasNow } from './relax-answers';

// The app's check of an answer's `input`, the conditions sent back to recalculate, as main-server
// `assistant/dto/answer.dto.ts` fixes them.

export function isOneOf<Value extends string>(values: readonly Value[]): (value: unknown) => value is Value {
  return (value: unknown): value is Value => values.some((one) => one === value);
}

function isConstraint(value: unknown): value is PersonConstraint {
  if (!isOneOf(['asker', 'person'])(field(value, 'source'))) {
    return false;
  }
  switch (field(value, 'kind')) {
    case 'from':
      return isText(field(value, 'placeId'));
    case 'notBefore':
    case 'leaveBy':
      return isText(field(value, 'time'));
    default:
      return false;
  }
}

function isPerson(value: unknown): value is PlanPerson {
  return isText(field(value, 'userId')) && listOf(isConstraint)(field(value, 'constraints'));
}

// The people, the window, and the Place a meal and a meet share.
function isGathering(value: unknown): boolean {
  const window = field(value, 'window');
  return (
    isText(field(value, 'date')) &&
    listOf(isPerson)(field(value, 'people')) &&
    isTextOrNull(field(window, 'from')) &&
    isTextOrNull(field(window, 'until')) &&
    isTextOrNull(field(value, 'placeId'))
  );
}

const isCuisine = isOneOf(['한식', '중식', '일식', '양식', '분식']);

// The kind of food on screen: absent or null for none, and from an app before P05 ticket 15.
function isCuisineOrNone(value: unknown): boolean {
  return value === undefined || value === null || isCuisine(value);
}

// The Classes left out: absent for none, and from a main server before P04 ticket 93.
function isSkippedOrNone(value: unknown): boolean {
  return value === undefined || listOf(isText)(value);
}

function isMealInput(value: unknown): value is MealInput {
  return (
    field(value, 'kind') === 'meal' &&
    isOneOf(['lunch', 'dinner'])(field(value, 'meal')) &&
    isGathering(value) &&
    hasNow(field(value, 'window')) &&
    isCuisineOrNone(field(value, 'cuisine')) &&
    isSkippedOrNone(field(value, 'skipped'))
  );
}

function isMeetInput(value: unknown): value is MeetInput {
  return field(value, 'kind') === 'meet' && isGathering(value);
}

function isEventsInput(value: unknown): value is EventsInput {
  const eventIds = field(value, 'eventIds');
  return (
    field(value, 'kind') === 'events' && isText(field(value, 'date')) && (eventIds === null || listOf(isText)(eventIds))
  );
}

function isQuestsInput(value: unknown): value is QuestsInput {
  const globalEventId = field(value, 'globalEventId');
  const questIds = field(value, 'questIds');
  return (
    field(value, 'kind') === 'quests' &&
    isTextOrNull(globalEventId) &&
    (questIds === null || listOf(isText)(questIds)) &&
    (globalEventId === null) !== (questIds === null)
  );
}

function isNewQuestInput(value: unknown): value is NewQuestInput {
  const board = field(value, 'board');
  return (
    field(value, 'kind') === 'new-quest' &&
    isText(field(value, 'date')) &&
    ['globalEventId', 'title', 'placeId', 'time'].every((name) => isTextOrNull(field(value, name))) &&
    listOf(isPerson)(field(value, 'people')) &&
    (board === undefined || (board !== null && isBoard(board)))
  );
}

export function isInput(value: unknown): value is PlanInput {
  return [isMealInput, isEventsInput, isQuestsInput, isNewQuestInput, isMeetInput].some((isKind) => isKind(value));
}
