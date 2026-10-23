/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-23  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import type { GlobalEvent } from '@/api/types';
import { field, hasTexts, isNumber, isTextOrNull, listOf } from './answers';
import { call } from './http';

// The operations of the 행사 tab: the Global Events. The recruiting Quests and joining are the 파티 tab's.

// A published Global Event, as the 행사 tab's list and the Assistant's cards carry it.
export function isGlobalEvent(value: unknown): value is GlobalEvent {
  return (
    hasTexts(value, ['id', 'title', 'description', 'startsAt']) &&
    isTextOrNull(field(value, 'endsAt')) &&
    isTextOrNull(field(value, 'place')) &&
    isNumber(field(value, 'latitude')) &&
    isNumber(field(value, 'longitude')) &&
    isTextOrNull(field(value, 'sourceUrl'))
  );
}

type EventClient = Pick<ApiClient, 'listGlobalEvents'>;

export const eventClient: EventClient = {
  listGlobalEvents: () => call('GET', '/global-events', listOf(isGlobalEvent)),
};
