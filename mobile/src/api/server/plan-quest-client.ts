/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import type { PlanQuest } from '@/api/plan-quest-types';
import { field, hasTexts, listOf } from './answers';
import { call } from './http';
import { isQuest } from './quest-answers';

function isInvitation(value: unknown): value is PlanQuest['invitations'][number] {
  return hasTexts(value, ['id', 'userId']);
}

export function isPlanQuest(value: unknown): value is PlanQuest {
  return isQuest(field(value, 'quest')) && listOf(isInvitation)(field(value, 'invitations'));
}

export const planQuestClient: Pick<ApiClient, 'makePlanQuest'> = {
  makePlanQuest: (making, idempotencyKey) =>
    call('POST', '/plans', isPlanQuest, { body: making, headers: { 'Idempotency-Key': idempotencyKey } }),
};
