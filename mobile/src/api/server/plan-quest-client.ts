/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { ANSWER_CAPABILITIES } from '@/api/assistant-types';
import type { ApiClient } from '@/api/client';
import type { AskLevel, BetterPlan, MakePlanQuest, PlanQuest } from '@/api/plan-quest-types';
import type { LocationMissing } from '@/api/refusal-types';
import type { LatLng } from '@/api/types';
import { field, hasTexts, isFriendLevel, isNumber, listOf } from './answers';
import { call } from './http';
import { isPlacePoint, isPlan } from './plan-answers';
import { isInput } from './plan-inputs';
import { isQuest } from './quest-answers';

function isInvitation(value: unknown): value is PlanQuest['invitations'][number] {
  return hasTexts(value, ['id', 'userId']);
}

function isAskLevel(value: unknown): value is AskLevel {
  return hasTexts(value, ['userId', 'name']) && isFriendLevel(field(value, 'level'));
}

export function isPlanQuest(value: unknown): value is PlanQuest {
  return (
    isQuest(field(value, 'quest')) &&
    listOf(isInvitation)(field(value, 'invitations')) &&
    listOf(isAskLevel)(field(value, 'askLevels'))
  );
}

function isCurrent(value: unknown): value is BetterPlan['current'] {
  return (
    value === null ||
    (isPlacePoint(field(value, 'place')) &&
      hasTexts(value, ['startAt', 'endAt']) &&
      isNumber(field(value, 'togetherMinutes')))
  );
}

export function isBetterPlan(value: unknown): value is BetterPlan {
  const better = field(value, 'better');
  const input = field(value, 'input');
  return (
    isCurrent(field(value, 'current')) && (better === null || isPlan(better)) && (input === null || isInput(input))
  );
}

// Where the phone is, or else why that is not known, the reason left out when it is, as the making leaves it out.
function whereOrWhy(location: LatLng | null, missing: LocationMissing): Record<string, string | number> {
  if (location !== null) {
    return { latitude: location.latitude, longitude: location.longitude };
  }
  return missing === null ? {} : { locationMissing: missing };
}

// The request's body: the Plan to make, and what the app can draw beside a Quest already set (P04 ticket 17), which
// decides whether the main server refuses a second one or replaces it.
function bodyOf(making: MakePlanQuest): MakePlanQuest & { clientCapabilities: typeof ANSWER_CAPABILITIES } {
  return { ...making, clientCapabilities: ANSWER_CAPABILITIES };
}

export const planQuestClient: Pick<ApiClient, 'makePlanQuest' | 'getBetterPlan' | 'changePlanQuest'> = {
  makePlanQuest: (making, idempotencyKey) =>
    call('POST', '/plans', isPlanQuest, { body: bodyOf(making), headers: { 'Idempotency-Key': idempotencyKey } }),
  getBetterPlan: (questId, location, missing = null) =>
    call('GET', `/plans/${encodeURIComponent(questId)}/better`, isBetterPlan, { query: whereOrWhy(location, missing) }),
  changePlanQuest: (questId, making) =>
    call('PUT', `/plans/${encodeURIComponent(questId)}`, isQuest, { body: bodyOf(making) }),
};
