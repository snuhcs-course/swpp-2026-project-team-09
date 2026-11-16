/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { InterestMatches, WatchedInterest } from '@/api/interest-types';
import { field, hasTexts, isNothing, isText, listOf } from './answers';
import { call } from './http';

// The watched interests' routes (main-server's README, Interests).

export function isWatchedInterest(value: unknown): value is WatchedInterest {
  return hasTexts(value, ['id', 'words', 'createdAt']) && listOf(isText)(field(value, 'topics'));
}

function isMatch(value: unknown): value is InterestMatches['globalEvents'][number] {
  return isText(field(value, 'id')) && typeof field(value, 'watched') === 'boolean';
}

export function isInterestMatches(value: unknown): value is InterestMatches {
  return listOf(isMatch)(field(value, 'globalEvents')) && listOf(isMatch)(field(value, 'quests'));
}

// A main server older than the route answers 404, which no User's answer can.
async function unlessMissing<Answer>(asked: () => Promise<Answer>): Promise<Answer | null> {
  try {
    return await asked();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

type InterestClient = Pick<ApiClient, 'listInterests' | 'watchInterest' | 'removeInterest' | 'listInterestMatches'>;

export const interestClient: InterestClient = {
  listInterests: () => unlessMissing(() => call('GET', '/interests', listOf(isWatchedInterest))),
  watchInterest: (words) => call('POST', '/interests', isWatchedInterest, { body: { words } }),
  removeInterest: async (interestId) => {
    await call('DELETE', `/interests/${encodeURIComponent(interestId)}`, isNothing);
  },
  listInterestMatches: () => unlessMissing(() => call('GET', '/interests/matches', isInterestMatches)),
};
