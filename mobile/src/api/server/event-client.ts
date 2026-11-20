/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-20  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import type { GlobalEvent, ListedGlobalEvent } from '@/api/types';
import { field, hasTexts, isNothing, isNumber, isTextOrNull, listOf } from './answers';
import { call } from './http';

// The operations of the 행사 tab: the Global Events and the User's Favorite Events. The recruiting Quests and joining
// are the 파티 tab's.

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

// An entry of GET /global-events, with what is the User's own.
function isListedGlobalEvent(value: unknown): value is ListedGlobalEvent {
  return (
    isGlobalEvent(value) && isTextOrNull(field(value, 'publishedAt')) && typeof field(value, 'favorite') === 'boolean'
  );
}

type EventClient = Pick<ApiClient, 'listGlobalEvents' | 'setFavoriteEvent'>;

export const eventClient: EventClient = {
  listGlobalEvents: () => call('GET', '/global-events', listOf(isListedGlobalEvent)),
  setFavoriteEvent: async (globalEventId, favorite) => {
    await call(favorite ? 'PUT' : 'DELETE', `/global-events/${encodeURIComponent(globalEventId)}/favorite`, isNothing);
  },
};
