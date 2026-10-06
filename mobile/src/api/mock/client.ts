import type { ApiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { OnboardingAnswers, Profile } from '@/api/types';
import { CAMPUS_BOUNDS, isInside } from '@/map/campus';
import { keep, readKept } from '@/storage/kept';
import { answer } from './answer';
import { FOOTPRINTS } from './data/footprints';
import { FRIEND_STATUSES, MY_FRIEND_ID } from './data/friends';
import { GLOBAL_EVENT_ANNOUNCERS, GLOBAL_EVENTS, MY_PARTY, PARTIES, QUESTS } from './data/quests';
import { CLASSES, PLACES } from './data/timetable';
import { MEETUPS, QUEST_INVITATIONS } from './data/waiting';
import { mockFriendships as friendships } from './friendships';
import { mockWalkingRoute } from './walking-route';

// The Master Switch, which the main server keeps on the User. The mock keeps it in memory: off at each start.
let masterSwitchOn = false;

// For the tests: a new start of the app.
export function forgetMockSwitch(): void {
  masterSwitchOn = false;
}

async function onboardingAnswers(): Promise<OnboardingAnswers> {
  const { answers, onboardingCompleted } = await readKept();
  if (!onboardingCompleted || answers === null) {
    throw new ApiError(403, 'ONBOARDING_REQUIRED');
  }
  return answers;
}

function profileOf({ name, department, admissionYear, hashtags }: OnboardingAnswers): Profile {
  return { name, department, admissionYear, hashtags, friendId: MY_FRIEND_ID };
}

// Answers every operation from inside the app, in the main server's shapes, with what the `Main` frame shows. The
// development settings name an operation by its name here.
export const mockClient: ApiClient = {
  completeOnboarding: async (answers) => {
    await answer('completeOnboarding', async () => {
      await keep({ onboardingCompleted: true, answers, suggestion: null });
    });
  },
  enterLobby: () =>
    answer('enterLobby', async () => ({ profile: profileOf(await onboardingAnswers()), masterSwitch: masterSwitchOn })),
  // The profile is the Onboarding's answers on the phone, so the next Lobby holds the change.
  updateProfile: (change) =>
    answer('updateProfile', async () => {
      const answers = { ...(await onboardingAnswers()), ...change };
      await keep({ answers });
      return profileOf(answers);
    }),
  setMasterSwitch: (on) =>
    answer('setMasterSwitch', () => {
      masterSwitchOn = on;
    }),
  // As the main server: refused while the switch is off, and not kept off campus, here the camera's rectangle.
  uploadPosition: (position) =>
    answer('uploadPosition', () => {
      if (!masterSwitchOn) {
        throw new ApiError(409, 'MASTER_SWITCH_OFF');
      }
      return { offCampus: !isInside(position, CAMPUS_BOUNDS) };
    }),
  listFriends: () => answer('listFriends', friendships.listFriends, []),
  setFriendSharing: async (userId, on) => {
    await answer('setFriendSharing', () => {
      friendships.setFriendSharing(userId, on);
    });
  },
  endFriendship: async (userId) => {
    await answer('endFriendship', () => {
      friendships.endFriendship(userId);
    });
  },
  findFriendId: (friendId) => answer('findFriendId', () => friendships.findFriendId(friendId)),
  sendFriendRequest: (friendId) => answer('sendFriendRequest', () => friendships.sendFriendRequest(friendId)),
  listFriendRequests: () => answer('listFriendRequests', friendships.listFriendRequests, { received: [], sent: [] }),
  acceptFriendRequest: async (requestId) => {
    await answer('acceptFriendRequest', () => {
      friendships.acceptFriendRequest(requestId);
    });
  },
  declineFriendRequest: async (requestId) => {
    await answer('declineFriendRequest', () => {
      friendships.declineFriendRequest(requestId);
    });
  },
  cancelFriendRequest: async (requestId) => {
    await answer('cancelFriendRequest', () => {
      friendships.cancelFriendRequest(requestId);
    });
  },
  createInviteLink: () => answer('createInviteLink', friendships.createInviteLink),
  getInviteLink: (token) => answer('getInviteLink', () => friendships.getInviteLink(token)),
  acceptInviteLink: async (token) => {
    await answer('acceptInviteLink', () => {
      friendships.acceptInviteLink(token);
    });
  },
  listPositions: () => answer('listPositions', friendships.listPositions, []),
  listFriendStatuses: () => answer('listFriendStatuses', () => FRIEND_STATUSES, []),
  listQuests: () => answer('listQuests', () => QUESTS, []),
  listQuestInvitations: () => answer('listQuestInvitations', () => QUEST_INVITATIONS, []),
  // The User leads no Quest of the mock's.
  listJoinRequests: () => answer('listJoinRequests', () => [], []),
  listMeetups: () => answer('listMeetups', () => MEETUPS, { received: [], sent: [] }),
  listClasses: () => answer('listClasses', () => CLASSES, []),
  listPlaces: () => answer('listPlaces', () => PLACES, []),
  listGlobalEvents: () => answer('listGlobalEvents', () => GLOBAL_EVENTS, []),
  listGlobalEventAnnouncers: () => answer('listGlobalEventAnnouncers', () => GLOBAL_EVENT_ANNOUNCERS, []),
  listParties: () => answer('listParties', () => PARTIES, []),
  getMyParty: () => answer('getMyParty', () => MY_PARTY, null),
  getFootprints: () => answer('getFootprints', () => FOOTPRINTS, { friendCount: 0, faces: [] }),
  findWalkingRoute: (from, to) =>
    answer('findWalkingRoute', () => mockWalkingRoute(from, to), {
      status: 'ROUTE_RESULT_NOT_FOUND',
      route: null,
    }),
};
