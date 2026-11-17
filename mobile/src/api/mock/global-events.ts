/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import { answer } from './answer';
import { GLOBAL_EVENTS } from './data/quests';

// The User's list of Global Events, with the Favorite Events as the main server keeps them, in memory. At each start
// the User has starred the frame's event, so that the everyday map, which keeps only Favorite Events, shows it as the
// `Main` frame does.
const STARRED_AT_START = ['e1'];
const favorites = new Set<string>(STARRED_AT_START);

// For the tests: a new start of the app.
export function forgetMockFavorites(): void {
  favorites.clear();
  for (const id of STARRED_AT_START) {
    favorites.add(id);
  }
}

export const mockGlobalEvents: Pick<ApiClient, 'listGlobalEvents' | 'setFavoriteEvent'> = {
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
