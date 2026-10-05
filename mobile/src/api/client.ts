import { mockClient } from './mock/client';
import type {
  Friend,
  FriendStatus,
  GlobalEvent,
  LatLng,
  Lobby,
  MyParty,
  OnboardingAnswers,
  Party,
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
  // Null for a User who is in no Party.
  getMyParty: () => Promise<MyParty | null>;
  findWalkingRoute: (from: LatLng, to: LatLng) => Promise<WalkingRoute>;
}

// The one client of the app. Every operation is a mock for now; the last ticket of P06 puts the main server behind an
// operation by replacing it here, and no screen changes.
export const apiClient: ApiClient = mockClient;
