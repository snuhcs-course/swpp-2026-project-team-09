// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-08, prompted by Jaehyun0320 and fyoon46
import type { ApiClient } from '@/api/client';
import { isRefusal } from '@/api/errors';
import { mockClient } from '@/api/mock/client';
import type { OnboardingAnswers } from '@/api/types';
import { newIdempotencyKey } from '@/api/idempotency-key';
import { keep } from '@/storage/kept';
import {
  isFriends,
  isInviteLink,
  isLobby,
  isMyParty,
  isNothing,
  isOpenedInviteLink,
  isParties,
  isPlaces,
  isPositionKept,
  isPositions,
  isProfile,
  isQuests,
  isSentFriendRequest,
  isTimetableClass,
  isTimetableClasses,
  isUserSummary,
  isWalkingRoute,
} from './answers';
import { isMenus } from './menu-answers';
import { isShuttleRoute, isShuttleVehicles } from './shuttle-answers';
import { isFriendRequests, isJoinRequests, isMeetups, isQuestInvitations } from './waiting-answers';
import { eventClient } from './event-client';
import { call } from './http';
import { meetupClient } from './meetup-client';
import { partyClient } from './party-client';
import { roomClient } from './room-client';

// The operations the main server serves on its main line, each from its route. What it does not serve stays the
// mock's: the Friends' statuses, who announced the Global Events, and 오늘의 발자국 (todo.md, section 3).
export const serverClient: ApiClient = {
  ...mockClient,
  ...roomClient,
  ...partyClient,
  ...eventClient,
  ...meetupClient,
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
  setFriendSharing: async (userId, on) => {
    await call('PUT', `/friends/${encodeURIComponent(userId)}/sharing`, isNothing, { body: { on } });
  },
  endFriendship: async (userId) => {
    await call('DELETE', `/friends/${encodeURIComponent(userId)}`, isNothing);
  },
  findFriendId: (friendId) => call('GET', `/friend-ids/${encodeURIComponent(friendId)}`, isUserSummary),
  sendFriendRequest: (friendId) => call('POST', '/friend-requests', isSentFriendRequest, { body: { friendId } }),
  listFriendRequests: () => call('GET', '/friend-requests', isFriendRequests),
  acceptFriendRequest: async (requestId) => {
    await call('POST', `/friend-requests/${encodeURIComponent(requestId)}/accept`, isNothing);
  },
  declineFriendRequest: async (requestId) => {
    await call('POST', `/friend-requests/${encodeURIComponent(requestId)}/decline`, isNothing);
  },
  cancelFriendRequest: async (requestId) => {
    await call('POST', `/friend-requests/${encodeURIComponent(requestId)}/cancel`, isNothing);
  },
  createInviteLink: () => call('POST', '/invite-links', isInviteLink),
  getInviteLink: (token) => call('GET', `/invite-links/${encodeURIComponent(token)}`, isOpenedInviteLink),
  acceptInviteLink: async (token) => {
    await call('POST', `/invite-links/${encodeURIComponent(token)}/accept`, isNothing);
  },
  listPositions: () => call('GET', '/positions', isPositions),
  listQuests: () => call('GET', '/quests', isQuests),
  listQuestInvitations: () => call('GET', '/quest-invitations', isQuestInvitations),
  listJoinRequests: (questId) => call('GET', `/quests/${encodeURIComponent(questId)}/join-requests`, isJoinRequests),
  listMeetups: () => call('GET', '/meetups', isMeetups),
  listClasses: () => call('GET', '/timetable/classes', isTimetableClasses),
  // Sent once for each press of 저장, so its key is new each time.
  addClass: (save) =>
    call('POST', '/timetable/classes', isTimetableClass, {
      body: save,
      headers: { 'Idempotency-Key': newIdempotencyKey() },
    }),
  replaceClass: (classId, save) =>
    call('PUT', `/timetable/classes/${encodeURIComponent(classId)}`, isTimetableClass, { body: save }),
  deleteClass: async (classId) => {
    await call('DELETE', `/timetable/classes/${encodeURIComponent(classId)}`, isNothing);
  },
  listPlaces: () => call('GET', '/places', isPlaces),
  searchPlaces: (words) => call('GET', '/places/search', isPlaces, { query: { q: words } }),
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
  listMenus: (date) => call('GET', '/menus', isMenus, { query: { date } }),
  getShuttle: () => call('GET', '/shuttle', isShuttleRoute),
  listShuttleVehicles: () => call('GET', '/shuttle/vehicles', isShuttleVehicles),
};
