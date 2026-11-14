/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import type { BetterPlan, PlanQuest } from '@/api/plan-quest-types';
import { field, hasTexts, isNumber, listOf } from './answers';
import { call } from './http';
import { isInput, isPlacePoint, isPlan } from './plan-answers';
import { isQuest } from './quest-answers';

function isInvitation(value: unknown): value is PlanQuest['invitations'][number] {
  return hasTexts(value, ['id', 'userId']);
}

export function isPlanQuest(value: unknown): value is PlanQuest {
  return isQuest(field(value, 'quest')) && listOf(isInvitation)(field(value, 'invitations'));
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

export const planQuestClient: Pick<ApiClient, 'makePlanQuest' | 'getBetterPlan' | 'changePlanQuest'> = {
  makePlanQuest: (making, idempotencyKey) =>
    call('POST', '/plans', isPlanQuest, { body: making, headers: { 'Idempotency-Key': idempotencyKey } }),
  getBetterPlan: (questId, location) =>
    call('GET', `/plans/${encodeURIComponent(questId)}/better`, isBetterPlan, {
      query: location === null ? {} : { latitude: location.latitude, longitude: location.longitude },
    }),
  changePlanQuest: (questId, making) => call('PUT', `/plans/${encodeURIComponent(questId)}`, isQuest, { body: making }),
};
