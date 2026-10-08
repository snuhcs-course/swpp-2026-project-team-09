import { mockClient } from './mock/client';
import { serverClient } from './server/client';
import { asksMainServer } from './servers';
import type { MatchingRequest } from './matching-types';
import type {
  Board,
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
  SubQuest,
  TimetableClass,
  UserSummary,
} from './types';
import type { RestaurantMenus } from './menu-types';
import type { ShuttleRoute, ShuttleVehicle } from './shuttle-types';
import type { PartyOpening, PlaceAt, SubQuestContent } from './room-types';
import type {
  FriendRequests,
  JoinRequest,
  Meetup,
  MeetupProposal,
  Meetups,
  MyJoinRequest,
  QuestInvitation,
} from './waiting-types';
import type { QuestChange, QuestMaking, RecruitingQuest } from './party-types';
import type { WalkingRoute } from './walking-route-types';

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
  // The key is kept for the retries of one proposal. Refused with 404 FRIEND_NOT_FOUND, 400 MEETUP_START_PASSED and
  // 404 PLACE_NOT_FOUND.
  proposeMeetup: (proposal: MeetupProposal, idempotencyKey: string) => Promise<Meetup>;
  // Each refused with 404 MEETUP_NOT_FOUND, and with 409 MEETUP_NOT_PROPOSED once the Meetup is no longer proposed.
  acceptMeetup: (meetupId: string) => Promise<void>;
  declineMeetup: (meetupId: string) => Promise<void>;
  withdrawMeetup: (meetupId: string) => Promise<void>;
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
  // `size` is 2 to 4.
  requestMatching: (globalEventId: string, size: number) => Promise<MatchingRequest>;
  // The waiting requests, the oldest first.
  listMatchingRequests: () => Promise<MatchingRequest[]>;
  // The latest request for the Global Event, in whatever state.
  getMatchingRequest: (globalEventId: string) => Promise<MatchingRequest>;
  withdrawMatchingRequest: (globalEventId: string) => Promise<void>;
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
  // One of the User's Quests, ended or not; 404 QUEST_NOT_FOUND for one the User does not hold.
  getQuest: (questId: string) => Promise<Quest>;
  dropQuest: (questId: string) => Promise<void>;
  // The key is kept for the retries of one add.
  addSubQuest: (questId: string, content: SubQuestContent, idempotencyKey: string) => Promise<SubQuest>;
  editSubQuest: (questId: string, subQuestId: string, content: SubQuestContent) => Promise<SubQuest>;
  cancelSubQuest: (questId: string, subQuestId: string) => Promise<void>;
  markSubQuestDone: (questId: string, subQuestId: string) => Promise<void>;
  // Removes the User's mark; nothing happens without one.
  unmarkSubQuestDone: (questId: string, subQuestId: string) => Promise<void>;
  handOverQuest: (questId: string, userId: string) => Promise<void>;
  removeHolder: (questId: string, userId: string) => Promise<void>;
  // Ends the Quest for every Holder.
  endQuest: (questId: string) => Promise<void>;
  acceptJoinRequest: (questId: string, requestId: string) => Promise<void>;
  declineJoinRequest: (questId: string, requestId: string) => Promise<void>;
  // The Leader's invitations into the Quest that wait, in the shape of the requests to join.
  listSentInvitations: (questId: string) => Promise<JoinRequest[]>;
  cancelInvitation: (questId: string, invitationId: string) => Promise<void>;
  openParty: (opening: PartyOpening) => Promise<MyParty>;
  joinParty: (partyId: string) => Promise<MyParty>;
  leaveParty: () => Promise<void>;
  setPartySharing: (on: boolean) => Promise<void>;
  removePartyMember: (userId: string) => Promise<void>;
  // Ends the User's Party for every member.
  endParty: () => Promise<void>;
  findPlaceAt: (position: LatLng) => Promise<PlaceAt>;
  // The newest first; every board and Global Event without a filter.
  listRecruitingQuests: (filter?: { board?: Board; globalEventId?: string }) => Promise<RecruitingQuest[]>;
  // An Open Quest, at once.
  joinQuest: (questId: string) => Promise<Quest>;
  // An Approval Quest: a request that the Leader answers.
  askToJoinQuest: (questId: string) => Promise<void>;
  listMyJoinRequests: () => Promise<MyJoinRequest[]>;
  withdrawJoinRequest: (requestId: string) => Promise<void>;
  makeQuest: (making: QuestMaking, idempotencyKey: string) => Promise<Quest>;
  // The User's Quest for the Global Event, Closed, made the first time with the title given or else the event's. A
  // Quest the User already holds for it keeps its title.
  attendGlobalEvent: (globalEventId: string, title?: string) => Promise<Quest>;
  changeQuest: (questId: string, change: QuestChange) => Promise<Quest>;
  inviteToQuest: (questId: string, userId: string) => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<Quest>;
  declineInvitation: (invitationId: string) => Promise<void>;
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
  proposeMeetup: (proposal, key) => chosen().proposeMeetup(proposal, key),
  acceptMeetup: (meetupId) => chosen().acceptMeetup(meetupId),
  declineMeetup: (meetupId) => chosen().declineMeetup(meetupId),
  withdrawMeetup: (meetupId) => chosen().withdrawMeetup(meetupId),
  listClasses: () => chosen().listClasses(),
  addClass: (save) => chosen().addClass(save),
  replaceClass: (classId, save) => chosen().replaceClass(classId, save),
  deleteClass: (classId) => chosen().deleteClass(classId),
  listPlaces: () => chosen().listPlaces(),
  searchPlaces: (words) => chosen().searchPlaces(words),
  listGlobalEvents: () => chosen().listGlobalEvents(),
  listGlobalEventAnnouncers: () => chosen().listGlobalEventAnnouncers(),
  listParties: () => chosen().listParties(),
  requestMatching: (globalEventId, size) => chosen().requestMatching(globalEventId, size),
  listMatchingRequests: () => chosen().listMatchingRequests(),
  getMatchingRequest: (globalEventId) => chosen().getMatchingRequest(globalEventId),
  withdrawMatchingRequest: (globalEventId) => chosen().withdrawMatchingRequest(globalEventId),
  getMyParty: () => chosen().getMyParty(),
  getFootprints: () => chosen().getFootprints(),
  findWalkingRoute: (from, to) => chosen().findWalkingRoute(from, to),
  listMenus: (date) => chosen().listMenus(date),
  getShuttle: () => chosen().getShuttle(),
  listShuttleVehicles: () => chosen().listShuttleVehicles(),
  getQuest: (questId) => chosen().getQuest(questId),
  dropQuest: (questId) => chosen().dropQuest(questId),
  addSubQuest: (questId, content, key) => chosen().addSubQuest(questId, content, key),
  editSubQuest: (questId, subQuestId, content) => chosen().editSubQuest(questId, subQuestId, content),
  cancelSubQuest: (questId, subQuestId) => chosen().cancelSubQuest(questId, subQuestId),
  markSubQuestDone: (questId, subQuestId) => chosen().markSubQuestDone(questId, subQuestId),
  unmarkSubQuestDone: (questId, subQuestId) => chosen().unmarkSubQuestDone(questId, subQuestId),
  handOverQuest: (questId, userId) => chosen().handOverQuest(questId, userId),
  removeHolder: (questId, userId) => chosen().removeHolder(questId, userId),
  endQuest: (questId) => chosen().endQuest(questId),
  acceptJoinRequest: (questId, requestId) => chosen().acceptJoinRequest(questId, requestId),
  declineJoinRequest: (questId, requestId) => chosen().declineJoinRequest(questId, requestId),
  listSentInvitations: (questId) => chosen().listSentInvitations(questId),
  cancelInvitation: (questId, invitationId) => chosen().cancelInvitation(questId, invitationId),
  openParty: (opening) => chosen().openParty(opening),
  joinParty: (partyId) => chosen().joinParty(partyId),
  leaveParty: () => chosen().leaveParty(),
  setPartySharing: (on) => chosen().setPartySharing(on),
  removePartyMember: (userId) => chosen().removePartyMember(userId),
  endParty: () => chosen().endParty(),
  findPlaceAt: (position) => chosen().findPlaceAt(position),
  listRecruitingQuests: (filter) => chosen().listRecruitingQuests(filter),
  joinQuest: (questId) => chosen().joinQuest(questId),
  askToJoinQuest: (questId) => chosen().askToJoinQuest(questId),
  listMyJoinRequests: () => chosen().listMyJoinRequests(),
  withdrawJoinRequest: (requestId) => chosen().withdrawJoinRequest(requestId),
  makeQuest: (making, key) => chosen().makeQuest(making, key),
  attendGlobalEvent: (globalEventId, title) => chosen().attendGlobalEvent(globalEventId, title),
  changeQuest: (questId, change) => chosen().changeQuest(questId, change),
  inviteToQuest: (questId, userId) => chosen().inviteToQuest(questId, userId),
  acceptInvitation: (invitationId) => chosen().acceptInvitation(invitationId),
  declineInvitation: (invitationId) => chosen().declineInvitation(invitationId),
};
