/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import type { MatchingRequest } from '@/api/matching-types';
import type { GlobalEvent } from '@/api/types';
import { field, hasTexts, isNothing, isNumber, isTextOrNull, listOf } from './answers';
import { call } from './http';

// The operations of the 행사 tab: the Global Events and Matching. The recruiting Quests and joining are the 파티 tab's.

function isGlobalEvent(value: unknown): value is GlobalEvent {
  return (
    hasTexts(value, ['id', 'title', 'description', 'startsAt']) &&
    isTextOrNull(field(value, 'endsAt')) &&
    isTextOrNull(field(value, 'place')) &&
    isNumber(field(value, 'latitude')) &&
    isNumber(field(value, 'longitude')) &&
    isTextOrNull(field(value, 'sourceUrl'))
  );
}

const MATCHING_STATES = new Set(['waiting', 'matched', 'withdrawn', 'expired']);

function isMatchingRequest(value: unknown): value is MatchingRequest {
  const state = field(value, 'state');
  return (
    hasTexts(value, ['globalEventId', 'arrivedAt']) &&
    isNumber(field(value, 'size')) &&
    typeof state === 'string' &&
    MATCHING_STATES.has(state) &&
    isTextOrNull(field(value, 'questId'))
  );
}

function matchingPath(globalEventId: string, rest = ''): string {
  return `/matching-requests/${encodeURIComponent(globalEventId)}${rest}`;
}

type EventClient = Pick<
  ApiClient,
  'listGlobalEvents' | 'requestMatching' | 'listMatchingRequests' | 'getMatchingRequest' | 'withdrawMatchingRequest'
>;

export const eventClient: EventClient = {
  listGlobalEvents: () => call('GET', '/global-events', listOf(isGlobalEvent)),
  requestMatching: (globalEventId, size) =>
    call('POST', '/matching-requests', isMatchingRequest, { body: { globalEventId, size } }),
  listMatchingRequests: () => call('GET', '/matching-requests', listOf(isMatchingRequest)),
  getMatchingRequest: (globalEventId) => call('GET', matchingPath(globalEventId), isMatchingRequest),
  withdrawMatchingRequest: async (globalEventId) => {
    await call('POST', matchingPath(globalEventId, '/withdraw'), isNothing);
  },
};
