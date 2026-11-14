/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { WatchedInterest } from '@/api/interest-types';
import { now } from '@/clock';
import { answer } from './answer';

// The watched interests as the main server keeps them (main-server's README, Interests), in memory while the app
// runs. The mock reads no topics: an interest's one topic is its words, normalised, as on a main server without a
// model.

const MOST = 20;
const LONGEST = 60;

let interests: WatchedInterest[] = [];
let made = 0;

// None, as the app starts. For the tests.
export function resetMockInterests(): void {
  interests = [];
  made = 0;
}

function normalised(words: string): string {
  return words.replaceAll(/\s/gu, '').replace(/^#+/u, '').toLowerCase();
}

function watch(said: string): WatchedInterest {
  const words = said.trim();
  if (words === '' || words.length > LONGEST) {
    throw new ApiError(400, null, {
      statusCode: 400,
      error: 'Bad Request',
      message: 'words must be 1 to 60 characters',
    });
  }
  const same = interests.find((interest) => normalised(interest.words) === normalised(words));
  if (same !== undefined) {
    return same;
  }
  if (interests.length >= MOST) {
    throw new ApiError(409, 'INTERESTS_FULL');
  }
  made += 1;
  const kept = { id: `interest-${made}`, words, topics: [normalised(words)], createdAt: now().toISOString() };
  interests = [kept, ...interests];
  return kept;
}

function remove(interestId: string): void {
  if (!interests.some(({ id }) => id === interestId)) {
    throw new ApiError(404, 'INTEREST_NOT_FOUND');
  }
  interests = interests.filter(({ id }) => id !== interestId);
}

export const mockInterests: Pick<ApiClient, 'listInterests' | 'watchInterest' | 'removeInterest'> = {
  listInterests: () => answer('listInterests', () => [...interests], []),
  watchInterest: (words) => answer('watchInterest', () => watch(words)),
  removeInterest: async (interestId) => {
    await answer('removeInterest', () => {
      remove(interestId);
    });
  },
};
