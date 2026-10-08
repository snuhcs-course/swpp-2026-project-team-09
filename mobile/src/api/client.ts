import { mockClient } from './mock/client';
import { serverClient } from './server/client';
import { asksMainServer } from './servers';
import type {
  ClassSave,
  Footprints,
  Friend,
  FriendStatus,
  GlobalEvent,
  InviteLink,
  LatLng,
  Lobby,
  MyParty,
  OnboardingAnswers,
  OpenedInviteLink,
  Party,
  Place,
  Position,
  PositionKept,
  PositionUpload,
  Profile,
  ProfileChange,
  Quest,
  SentFriendRequest,
  TimetableClass,
  UserSummary,
  WalkingRoute,
} from './types';
import type { RestaurantMenus } from './menu-types';
import type { ShuttleRoute, ShuttleVehicle } from './shuttle-types';
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
  // Refused with 404 FRIEND_NOT_FOUND for a User who is no Friend.
  setFriendSharing: (userId: string, on: boolean) => Promise<void>;
  endFriendship: (userId: string) => Promise<void>;
  // Refused with 404 FRIEND_ID_NOT_FOUND.
  findFriendId: (friendId: string) => Promise<UserSummary>;
  // Also refused with 400 OWN_FRIEND_ID, 409 ALREADY_FRIENDS and 409 FRIEND_REQUEST_ALREADY_SENT.
  sendFriendRequest: (friendId: string) => Promise<SentFriendRequest>;
  listFriendRequests: () => Promise<FriendRequests>;
  // Each refused with 404 FRIEND_REQUEST_NOT_FOUND for a request that waits no more.
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  cancelFriendRequest: (requestId: string) => Promise<void>;
  createInviteLink: () => Promise<InviteLink>;
  // Refused with 404 INVITE_LINK_NOT_FOUND.
  getInviteLink: (token: string) => Promise<OpenedInviteLink>;
  // Also refused with 400 OWN_INVITE_LINK, 409 INVITE_LINK_USED, 410 INVITE_LINK_EXPIRED and 409 ALREADY_FRIENDS.
  acceptInviteLink: (token: string) => Promise<void>;
  listPositions: () => Promise<Position[]>;
  listFriendStatuses: () => Promise<FriendStatus[]>;
  listQuests: () => Promise<Quest[]>;
  listQuestInvitations: () => Promise<QuestInvitation[]>;
  // Only for a Quest the User leads.
  listJoinRequests: (questId: string) => Promise<JoinRequest[]>;
  listMeetups: () => Promise<Meetups>;
  listClasses: () => Promise<TimetableClass[]>;
  // A class without its identifiers and overlaps. Each refused with 404 PLACE_NOT_FOUND for a Place not in the list; an add also with 409 TIMETABLE_FULL at 15
  // classes, and a replacement with 404 CLASS_NOT_FOUND.
  addClass: (save: ClassSave) => Promise<TimetableClass>;
  replaceClass: (classId: string, save: ClassSave) => Promise<TimetableClass>;
  // Refused with 404 CLASS_NOT_FOUND.
  deleteClass: (classId: string) => Promise<void>;
  listPlaces: () => Promise<Place[]>;
  // The Places whose name holds the words, or whose number they are, with or without 동.
  searchPlaces: (words: string) => Promise<Place[]>;
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
  // One day's menus, a calendar day in Korea as "2026-10-06", by restaurant.
  listMenus: (date: string) => Promise<RestaurantMenus[]>;
  getShuttle: () => Promise<ShuttleRoute>;
  // The vehicles in service, [] when none runs.
  listShuttleVehicles: () => Promise<ShuttleVehicle[]>;
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
  setFriendSharing: (userId, on) => chosen().setFriendSharing(userId, on),
  endFriendship: (userId) => chosen().endFriendship(userId),
  findFriendId: (friendId) => chosen().findFriendId(friendId),
  sendFriendRequest: (friendId) => chosen().sendFriendRequest(friendId),
  listFriendRequests: () => chosen().listFriendRequests(),
  acceptFriendRequest: (requestId) => chosen().acceptFriendRequest(requestId),
  declineFriendRequest: (requestId) => chosen().declineFriendRequest(requestId),
  cancelFriendRequest: (requestId) => chosen().cancelFriendRequest(requestId),
  createInviteLink: () => chosen().createInviteLink(),
  getInviteLink: (token) => chosen().getInviteLink(token),
  acceptInviteLink: (token) => chosen().acceptInviteLink(token),
  listPositions: () => chosen().listPositions(),
  listFriendStatuses: () => chosen().listFriendStatuses(),
  listQuests: () => chosen().listQuests(),
  listQuestInvitations: () => chosen().listQuestInvitations(),
  listJoinRequests: (questId) => chosen().listJoinRequests(questId),
  listMeetups: () => chosen().listMeetups(),
  listClasses: () => chosen().listClasses(),
  addClass: (save) => chosen().addClass(save),
  replaceClass: (classId, save) => chosen().replaceClass(classId, save),
  deleteClass: (classId) => chosen().deleteClass(classId),
  listPlaces: () => chosen().listPlaces(),
  searchPlaces: (words) => chosen().searchPlaces(words),
  listGlobalEvents: () => chosen().listGlobalEvents(),
  listGlobalEventAnnouncers: () => chosen().listGlobalEventAnnouncers(),
  listParties: () => chosen().listParties(),
  getMyParty: () => chosen().getMyParty(),
  getFootprints: () => chosen().getFootprints(),
  findWalkingRoute: (from, to) => chosen().findWalkingRoute(from, to),
  listMenus: (date) => chosen().listMenus(date),
  getShuttle: () => chosen().getShuttle(),
  listShuttleVehicles: () => chosen().listShuttleVehicles(),
};
