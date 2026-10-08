import { mockClient } from './mock/client';
import { serverClient } from './server/client';
import { asksMainServer } from './servers';
import type {
  Footprints,
  Friend,
  FriendStatus,
  GlobalEvent,
  LatLng,
  Lobby,
  MyParty,
  OnboardingAnswers,
  Party,
  Place,
  Position,
  PositionKept,
  PositionUpload,
  Profile,
  ProfileChange,
  Quest,
  TimetableClass,
  WalkingRoute,
} from './types';
import type { FriendRequests, JoinRequest, Meetups, QuestInvitation } from './waiting-types';

// Everything the screens ask of the main server. A refusal or no answer is thrown as an `ApiError`.
export interface ApiClient {
  completeOnboarding: (answers: OnboardingAnswers) => Promise<void>;
  // Refused with 403 ONBOARDING_REQUIRED until Onboarding is finished.
  enterLobby: () => Promise<Lobby>;
  updateProfile: (change: ProfileChange) => Promise<Profile>;
  setMasterSwitch: (on: boolean) => Promise<void>;
  // Refused with 409 MASTER_SWITCH_OFF while the Master Switch is off.
  uploadPosition: (position: PositionUpload) => Promise<PositionKept>;
  listFriends: () => Promise<Friend[]>;
  listFriendRequests: () => Promise<FriendRequests>;
  listPositions: () => Promise<Position[]>;
  listFriendStatuses: () => Promise<FriendStatus[]>;
  listQuests: () => Promise<Quest[]>;
  listQuestInvitations: () => Promise<QuestInvitation[]>;
  // Only for a Quest the User leads.
  listJoinRequests: (questId: string) => Promise<JoinRequest[]>;
  listMeetups: () => Promise<Meetups>;
  listClasses: () => Promise<TimetableClass[]>;
  listPlaces: () => Promise<Place[]>;
  listGlobalEvents: () => Promise<GlobalEvent[]>;
  // Who announced each Global Event. The app's own: the stored event does not hold it.
  listGlobalEventAnnouncers: () => Promise<{ eventId: string; announcer: string }[]>;
  listParties: () => Promise<Party[]>;
  // Null for a User who is in no Party. The main server says so with a refusal, 404 NOT_IN_PARTY: the operation turns
  // exactly that one into null, with `isRefusal`, and throws any other.
  getMyParty: () => Promise<MyParty | null>;
  // What "오늘의 발자국" shows: how many Friends left a story today, and three faces. The app's own: no answer of the
  // main server holds it.
  getFootprints: () => Promise<Footprints>;
  findWalkingRoute: (from: LatLng, to: LatLng) => Promise<WalkingRoute>;
}

// The main server's client in a build that asks it, and the mocks everywhere else (`asksMainServer()`). Chosen at each
// call, so that a test can choose by its settings.
function chosen(): ApiClient {
  return asksMainServer() ? serverClient : mockClient;
}

// The one client of the app. The screens ask it and never know which of the two answers.
export const apiClient: ApiClient = {
  completeOnboarding: (answers) => chosen().completeOnboarding(answers),
  enterLobby: () => chosen().enterLobby(),
  updateProfile: (change) => chosen().updateProfile(change),
  setMasterSwitch: (on) => chosen().setMasterSwitch(on),
  uploadPosition: (position) => chosen().uploadPosition(position),
  listFriends: () => chosen().listFriends(),
  listFriendRequests: () => chosen().listFriendRequests(),
  listPositions: () => chosen().listPositions(),
  listFriendStatuses: () => chosen().listFriendStatuses(),
  listQuests: () => chosen().listQuests(),
  listQuestInvitations: () => chosen().listQuestInvitations(),
  listJoinRequests: (questId) => chosen().listJoinRequests(questId),
  listMeetups: () => chosen().listMeetups(),
  listClasses: () => chosen().listClasses(),
  listPlaces: () => chosen().listPlaces(),
  listGlobalEvents: () => chosen().listGlobalEvents(),
  listGlobalEventAnnouncers: () => chosen().listGlobalEventAnnouncers(),
  listParties: () => chosen().listParties(),
  getMyParty: () => chosen().getMyParty(),
  getFootprints: () => chosen().getFootprints(),
  findWalkingRoute: (from, to) => chosen().findWalkingRoute(from, to),
};
