import type { ApiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { MatchingRequest } from '@/api/matching-types';
import { answer } from './answer';
import { FRAME_NOW } from './data/frame';
import { GLOBAL_EVENTS, QUESTS } from './data/quests';

// The 행사 tab's operations as the main server answers them. Matching requests are kept in memory and refused as the
// main server refuses them.

let requests: MatchingRequest[] = [];

// For the tests: a new start of the app.
export function forgetMockMatching(): void {
  requests = [];
}

function latestFor(globalEventId: string): MatchingRequest | undefined {
  return requests.findLast((request) => request.globalEventId === globalEventId);
}

function refuseMatching(globalEventId: string, size: number): void {
  const event = GLOBAL_EVENTS.find(({ id }) => id === globalEventId);
  if (!Number.isInteger(size) || size < 2 || size > 4) {
    throw new ApiError(400, 'MATCHING_SIZE_OUT_OF_RANGE');
  }
  if (event === undefined) {
    throw new ApiError(404, 'GLOBAL_EVENT_NOT_FOUND');
  }
  if (new Date(event.startsAt).getTime() <= new Date(FRAME_NOW).getTime()) {
    throw new ApiError(409, 'GLOBAL_EVENT_STARTED');
  }
  if (QUESTS.some((quest) => quest.globalEvent?.id === globalEventId && quest.holders.length > 1)) {
    throw new ApiError(409, 'SHARED_QUEST_HELD');
  }
  if (latestFor(globalEventId)?.state === 'waiting') {
    throw new ApiError(409, 'MATCHING_REQUEST_WAITING');
  }
}

type EventMock = Pick<
  ApiClient,
  'requestMatching' | 'listMatchingRequests' | 'getMatchingRequest' | 'withdrawMatchingRequest'
>;

export const mockEvents: EventMock = {
  requestMatching: (globalEventId, size) =>
    answer('requestMatching', () => {
      refuseMatching(globalEventId, size);
      const request: MatchingRequest = {
        globalEventId,
        size,
        state: 'waiting',
        arrivedAt: FRAME_NOW,
        questId: null,
      };
      requests = [...requests, request];
      return request;
    }),
  listMatchingRequests: () =>
    answer('listMatchingRequests', () => requests.filter(({ state }) => state === 'waiting'), []),
  getMatchingRequest: (globalEventId) =>
    answer('getMatchingRequest', () => {
      const request = latestFor(globalEventId);
      if (request === undefined) {
        throw new ApiError(404, 'MATCHING_REQUEST_NOT_FOUND');
      }
      return request;
    }),
  withdrawMatchingRequest: (globalEventId) =>
    answer('withdrawMatchingRequest', () => {
      const request = latestFor(globalEventId);
      if (request === undefined) {
        throw new ApiError(404, 'MATCHING_REQUEST_NOT_FOUND');
      }
      if (request.state !== 'waiting') {
        throw new ApiError(409, 'MATCHING_REQUEST_NOT_WAITING');
      }
      requests = requests.with(requests.indexOf(request), { ...request, state: 'withdrawn' });
    }),
};
