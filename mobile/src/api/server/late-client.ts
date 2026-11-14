/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import type { OwnWay } from '@/api/invitation-card-types';
import type { LateReport } from '@/api/late-types';
import { call } from './http';
import { isWay } from './invitation-card-client';

// A late report is always answered with a way, never with none.
export function isLateWay(value: unknown): value is OwnWay {
  return value !== null && isWay(value);
}

export const lateClient: Pick<ApiClient, 'reportLate'> = {
  reportLate: (questId, minutes, location) => {
    const body: LateReport = { minutes, location };
    return call('POST', `/quests/${encodeURIComponent(questId)}/late`, isLateWay, { body });
  },
};
