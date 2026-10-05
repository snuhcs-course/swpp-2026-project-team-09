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
  PartyNews,
  Position,
  Quest,
  WalkingRoute,
} from './types';

// Everything the screens ask of the main server. A refusal or no answer is thrown as an `ApiError`.
export interface ApiClient {
  completeOnboarding: (answers: OnboardingAnswers) => Promise<void>;
  // Refused with 403 ONBOARDING_REQUIRED until Onboarding is finished.
  enterLobby: () => Promise<Lobby>;
  listFriends: () => Promise<Friend[]>;
  listPositions: () => Promise<Position[]>;
  listFriendStatuses: () => Promise<FriendStatus[]>;
  listQuests: () => Promise<Quest[]>;
  listGlobalEvents: () => Promise<GlobalEvent[]>;
  // Who announced each Global Event. The app's own: the stored event does not hold it.
  listGlobalEventAnnouncers: () => Promise<{ eventId: string; announcer: string }[]>;
  listParties: () => Promise<Party[]>;
  // Null for a User who is in no Party. The main server says so with a refusal, 404 NOT_IN_PARTY: the operation turns
  // exactly that one into null, with `isRefusal`, and throws any other.
  getMyParty: () => Promise<MyParty | null>;
  // How many things wait for the User in Parties. The app's own: no answer of the main server holds it.
  getPartyNews: () => Promise<PartyNews>;
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
  listFriends: () => chosen().listFriends(),
  listPositions: () => chosen().listPositions(),
  listFriendStatuses: () => chosen().listFriendStatuses(),
  listQuests: () => chosen().listQuests(),
  listGlobalEvents: () => chosen().listGlobalEvents(),
  listGlobalEventAnnouncers: () => chosen().listGlobalEventAnnouncers(),
  listParties: () => chosen().listParties(),
  getMyParty: () => chosen().getMyParty(),
  getPartyNews: () => chosen().getPartyNews(),
  getFootprints: () => chosen().getFootprints(),
  findWalkingRoute: (from, to) => chosen().findWalkingRoute(from, to),
};
