/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { InterestMatches, WatchedInterest } from '@/api/interest-types';
import { now } from '@/clock';
import { answer } from './answer';
import { GLOBAL_EVENTS } from './data/quests';

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

// The mock's events whose title or description holds a topic of a watched interest. The mock reads no hashtags and
// keeps no recruiting Quest's topics.
function matches(): InterestMatches {
  const topics = interests.flatMap((interest) => interest.topics);
  const globalEvents = GLOBAL_EVENTS.filter(({ title, description }) =>
    topics.some((topic) => normalised(`${title}${description}`).includes(topic)),
  );
  return { globalEvents: globalEvents.map(({ id }) => ({ id, watched: true })), quests: [] };
}

type MockInterests = Pick<ApiClient, 'listInterests' | 'watchInterest' | 'removeInterest' | 'listInterestMatches'>;

export const mockInterests: MockInterests = {
  listInterests: () => answer('listInterests', () => [...interests], []),
  listInterestMatches: () => answer('listInterestMatches', matches, { globalEvents: [], quests: [] }),
  watchInterest: (words) => answer('watchInterest', () => watch(words)),
  removeInterest: async (interestId) => {
    await answer('removeInterest', () => {
      remove(interestId);
    });
  },
};
