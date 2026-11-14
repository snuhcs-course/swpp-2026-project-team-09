/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import { answer } from './answer';
import { GLOBAL_EVENTS } from './data/quests';

// The Favorite Events as the main server keeps them, in memory: none at each start.
const favorites = new Set<string>();

// For the tests: a new start of the app.
export function forgetMockFavorites(): void {
  favorites.clear();
}

export const mockFavorites: Pick<ApiClient, 'listGlobalEvents' | 'setFavoriteEvent'> = {
  // The main server records no publishing time yet.
  listGlobalEvents: () =>
    answer(
      'listGlobalEvents',
      () => GLOBAL_EVENTS.map((event) => ({ ...event, publishedAt: null, favorite: favorites.has(event.id) })),
      [],
    ),
  setFavoriteEvent: (globalEventId, favorite) =>
    answer('setFavoriteEvent', () => {
      if (!GLOBAL_EVENTS.some(({ id }) => id === globalEventId)) {
        throw new ApiError(404, 'GLOBAL_EVENT_NOT_FOUND');
      }
      if (favorite) {
        favorites.add(globalEventId);
      } else {
        favorites.delete(globalEventId);
      }
    }),
};
