import type { ApiClient } from '@/api/client';
import { isRefusal } from '@/api/errors';
import { mockClient } from '@/api/mock/client';
import type { OnboardingAnswers } from '@/api/types';
import { keep } from '@/storage/kept';
import {
  isFriends,
  isLobby,
  isMyParty,
  isNothing,
  isParties,
  isPlaces,
  isPositionKept,
  isPositions,
  isProfile,
  isQuests,
  isTimetableClasses,
  isWalkingRoute,
} from './answers';
import { isFriendRequests, isJoinRequests, isMeetups, isQuestInvitations } from './waiting-answers';
import { call } from './http';

// The operations the main server serves on its main line, each from its route. What it does not serve stays the
// mock's: the Friends' statuses, the Global Events and who announced them, and 오늘의 발자국 (todo.md, section 3).
export const serverClient: ApiClient = {
  ...mockClient,
  // The main server stores four of the answers. The course level and the gender have no place there, so the phone
  // keeps them with the rest, once the main server has saved its part.
  completeOnboarding: async (answers: OnboardingAnswers) => {
    const { name, department, admissionYear, hashtags } = answers;
    await call('POST', '/users/me/onboarding', isNothing, { body: { name, department, admissionYear, hashtags } });
    await keep({ onboardingCompleted: true, answers, suggestion: null });
  },
  enterLobby: async () => {
    const lobby = await call('POST', '/lobby', isLobby);
    // The main server let the User in, so the User has finished Onboarding, whatever this phone kept.
    await keep({ onboardingCompleted: true });
    return lobby;
  },
  updateProfile: (change) => call('PATCH', '/users/me/profile', isProfile, { body: change }),
  setMasterSwitch: async (on) => {
    await call('PUT', '/users/me/master-switch', isNothing, { body: { on } });
  },
  uploadPosition: (position) => call('POST', '/positions', isPositionKept, { body: position }),
  listFriends: () => call('GET', '/friends', isFriends),
  listFriendRequests: () => call('GET', '/friend-requests', isFriendRequests),
  listPositions: () => call('GET', '/positions', isPositions),
  listQuests: () => call('GET', '/quests', isQuests),
  listQuestInvitations: () => call('GET', '/quest-invitations', isQuestInvitations),
  listJoinRequests: (questId) => call('GET', `/quests/${encodeURIComponent(questId)}/join-requests`, isJoinRequests),
  listMeetups: () => call('GET', '/meetups', isMeetups),
  listClasses: () => call('GET', '/timetable/classes', isTimetableClasses),
  listPlaces: () => call('GET', '/places', isPlaces),
  listParties: () => call('GET', '/parties', isParties),
  getMyParty: async () => {
    try {
      return await call('GET', '/parties/mine', isMyParty);
    } catch (error) {
      if (isRefusal(error, 404, 'NOT_IN_PARTY')) {
        return null;
      }
      throw error;
    }
  },
  findWalkingRoute: (from, to) =>
    call('GET', '/walking-route', isWalkingRoute, {
      query: {
        startLatitude: from.latitude,
        startLongitude: from.longitude,
        endLatitude: to.latitude,
        endLongitude: to.longitude,
      },
    }),
};
