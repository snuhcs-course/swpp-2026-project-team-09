import type { ApiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import { keep, readKept } from '@/storage/kept';
import { answer } from './answer';
import { FOOTPRINTS } from './data/footprints';
import { FRIEND_STATUSES, FRIENDS, POSITIONS } from './data/friends';
import { GLOBAL_EVENT_ANNOUNCERS, GLOBAL_EVENTS, MY_PARTY, PARTIES, PARTY_NEWS, QUESTS } from './data/quests';
import { mockWalkingRoute } from './walking-route';

// Answers every operation from inside the app, in the main server's shapes, with what the `Main` frame shows. The
// development settings name an operation by its name here.
export const mockClient: ApiClient = {
  completeOnboarding: async (answers) => {
    await answer('completeOnboarding', async () => {
      await keep({ onboardingCompleted: true, answers, suggestion: null });
    });
  },
  enterLobby: () =>
    answer('enterLobby', async () => {
      const { answers, onboardingCompleted } = await readKept();
      if (!onboardingCompleted || answers === null) {
        throw new ApiError(403, 'ONBOARDING_REQUIRED');
      }
      const { name, department, admissionYear, hashtags } = answers;
      return { profile: { name, department, admissionYear, hashtags } };
    }),
  listFriends: () => answer('listFriends', () => FRIENDS, []),
  listPositions: () => answer('listPositions', () => POSITIONS, []),
  listFriendStatuses: () => answer('listFriendStatuses', () => FRIEND_STATUSES, []),
  listQuests: () => answer('listQuests', () => QUESTS, []),
  listGlobalEvents: () => answer('listGlobalEvents', () => GLOBAL_EVENTS, []),
  listGlobalEventAnnouncers: () => answer('listGlobalEventAnnouncers', () => GLOBAL_EVENT_ANNOUNCERS, []),
  listParties: () => answer('listParties', () => PARTIES, []),
  getMyParty: () => answer('getMyParty', () => MY_PARTY, null),
  getPartyNews: () => answer('getPartyNews', () => PARTY_NEWS, { count: 0 }),
  getFootprints: () => answer('getFootprints', () => FOOTPRINTS, { friendCount: 0, faces: [] }),
  findWalkingRoute: (from, to) =>
    answer('findWalkingRoute', () => mockWalkingRoute(from, to), {
      status: 'ROUTE_RESULT_NOT_FOUND',
      route: null,
    }),
};
