/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { WatchedInterest } from '@/api/interest-types';
import { field, hasTexts, isNothing, isText, listOf } from './answers';
import { call } from './http';

// The watched interests' routes (main-server's README, Interests).

export function isWatchedInterest(value: unknown): value is WatchedInterest {
  return hasTexts(value, ['id', 'words', 'createdAt']) && listOf(isText)(field(value, 'topics'));
}

type InterestClient = Pick<ApiClient, 'listInterests' | 'watchInterest' | 'removeInterest'>;

export const interestClient: InterestClient = {
  // A main server older than the route answers 404, which no User's list can.
  listInterests: async () => {
    try {
      return await call('GET', '/interests', listOf(isWatchedInterest));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },
  watchInterest: (words) => call('POST', '/interests', isWatchedInterest, { body: { words } }),
  removeInterest: async (interestId) => {
    await call('DELETE', `/interests/${encodeURIComponent(interestId)}`, isNothing);
  },
};
