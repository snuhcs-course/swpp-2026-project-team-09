/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { OnboardingAnswers, Profile } from '@/api/types';
import { CAMPUS_BOUNDS, isInside } from '@/map/campus';
import { keep, readKept } from '@/storage/kept';
import { answer } from './answer';
import { mockAssistantReply, mockRecalculation } from './assistant';
import { FOOTPRINTS } from './data/footprints';
import { FRIEND_STATUSES, MY_FRIEND_ID } from './data/friends';
import { MENUS } from './data/menus';
import { PLACES } from './data/places';
import { GLOBAL_EVENT_ANNOUNCERS, GLOBAL_EVENTS, MY_PARTY, PARTIES, QUESTS } from './data/quests';
import { QUEST_INVITATIONS } from './data/waiting';
import { mockEvents } from './events';
import { mockFriendships as friendships } from './friendships';
import { mockParty } from './party';
import { mockTimetable as timetable } from './timetable';
import { SHUTTLE, SHUTTLE_VEHICLES } from './data/shuttle';
import { STUDY_BUILDINGS } from './data/study-spaces';
import { mockRoom } from './room';
import { mockTutorial } from './tutorial';
import { mockWalkingRoute } from './walking-route';

// The Master Switch, which the main server keeps on the User. The mock keeps it in memory: off at each start.
let masterSwitchOn = false;

// The 학번, the 학적상 이름 and the 소속, which Onboarding does not ask. The mock keeps them in memory, as the switch.
type LibraryDetails = Pick<Profile, 'studentNumber' | 'registeredName' | 'affiliation'>;
const NO_LIBRARY_DETAILS: LibraryDetails = { studentNumber: null, registeredName: null, affiliation: null };
let libraryDetails = NO_LIBRARY_DETAILS;

// For the tests: a new start of the app.
export function forgetMockSwitch(): void {
  masterSwitchOn = false;
  libraryDetails = NO_LIBRARY_DETAILS;
}

// As the main server: a 학번 such as 2026-12345, with the hyphen or not, is kept as its nine digits, and an empty
// text as none. Another is refused with the message that names the field.
function studentNumberOf(sent: string | null): string | null {
  const studentNumber = sent?.trim() ?? '';
  if (studentNumber === '') {
    return null;
  }
  if (!/^\d{4}-?\d{5}$/u.test(studentNumber)) {
    throw new ApiError(400, null, {
      statusCode: 400,
      error: 'Bad Request',
      message: ['studentNumber: Invalid string: must be a 학번 such as 2026-12345'],
    });
  }
  return studentNumber.replace('-', '');
}

// An empty registered name is none, as an empty 학번 is.
function registeredNameOf(sent: string | null): string | null {
  const registeredName = sent?.trim() ?? '';
  return registeredName === '' ? null : registeredName;
}

// The details after a change, from those kept: a field left out stays.
function changedDetails({ studentNumber, registeredName, affiliation }: Partial<LibraryDetails>): LibraryDetails {
  return {
    studentNumber: studentNumber === undefined ? libraryDetails.studentNumber : studentNumberOf(studentNumber),
    registeredName: registeredName === undefined ? libraryDetails.registeredName : registeredNameOf(registeredName),
    affiliation: affiliation === undefined ? libraryDetails.affiliation : affiliation,
  };
}

async function onboardingAnswers(): Promise<OnboardingAnswers> {
  const { answers, onboardingCompleted } = await readKept();
  if (!onboardingCompleted || answers === null) {
    throw new ApiError(403, 'ONBOARDING_REQUIRED');
  }
  return answers;
}

function profileOf({ name, department, admissionYear, hashtags }: OnboardingAnswers): Profile {
  return { name, department, admissionYear, hashtags, friendId: MY_FRIEND_ID, ...libraryDetails };
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
  // The profile is the Onboarding's answers on the phone, so the next Lobby holds the change, and the library's
  // details in memory.
  updateProfile: (change) =>
    answer('updateProfile', async () => {
      const { studentNumber, registeredName, affiliation, ...onboarding } = change;
      const details = changedDetails({ studentNumber, registeredName, affiliation });
      const answers = { ...(await onboardingAnswers()), ...onboarding };
      await keep({ answers });
      libraryDetails = details;
      return profileOf(answers);
    }),
  getProfile: () => answer('getProfile', async () => profileOf(await onboardingAnswers())),
  setMasterSwitch: (on) =>
    answer('setMasterSwitch', () => {
      masterSwitchOn = on;
    }),
  // A mock build never registers for push.
  registerPushToken: () => Promise.resolve(),
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
  listClasses: () => answer('listClasses', timetable.listClasses, []),
  addClass: (save, key) => answer('addClass', () => timetable.addClass(save, key)),
  replaceClass: (classId, save) => answer('replaceClass', () => timetable.replaceClass(classId, save)),
  deleteClass: async (classId) => {
    await answer('deleteClass', () => {
      timetable.deleteClass(classId);
    });
  },
  resetTimetable: async () => {
    await answer('resetTimetable', () => {
      timetable.resetTimetable();
    });
  },
  listPlaces: () => answer('listPlaces', () => PLACES, []),
  searchPlaces: (words) => answer('searchPlaces', () => timetable.searchPlaces(words), []),
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
  listMenus: (date) => answer('listMenus', () => MENUS[date] ?? [], []),
  getShuttle: () => answer('getShuttle', () => SHUTTLE),
  listShuttleVehicles: () => answer('listShuttleVehicles', () => SHUTTLE_VEHICLES, []),
  listStudySpaces: () => answer('listStudySpaces', () => STUDY_BUILDINGS, []),
  askAssistant: (messages, context) => answer('askAssistant', () => mockAssistantReply(messages, context)),
  recalculateAnswer: (input) => answer('recalculateAnswer', () => mockRecalculation(input)),
  ...mockRoom,
  ...mockParty,
  ...mockEvents,
  ...mockTutorial,
};
