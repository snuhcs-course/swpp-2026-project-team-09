// The answers of the main server, as the app reads them. A shape marked "provisional" comes from an open pull request
// of the main server and may still change; one marked "the app's own" is defined nowhere else yet. All times are
// ISO 8601 instants and all positions a latitude and a longitude in degrees.

export interface LatLng {
  latitude: number;
  longitude: number;
}

// --- Sign-in (POST /auth/google) ---

// What the sign-in suggests for Onboarding. A part that could not be read is null.
export interface Suggestion {
  name: string | null;
  department: string | null;
}

export type Onboarding = { completed: true } | { completed: false; suggestion: Suggestion };

export type SignInResult =
  | { outcome: 'signed-in'; onboarding: Onboarding }
  // The User closed Google's sheet.
  | { outcome: 'cancelled' }
  // The main server's 403: not an snu.ac.kr account.
  | { outcome: 'not-snu-account' }
  // Any other refusal, or no answer.
  | { outcome: 'failed' };

// --- Onboarding (POST /users/me/onboarding) ---

export type Gender = { kind: 'female' | 'male' } | { kind: 'custom'; text: string };

export interface OnboardingAnswers {
  // 1 to 30 characters.
  name: string;
  // 1 to 50 characters.
  department: string;
  // Null for "그 외" and for no choice.
  admissionYear: number | null;
  // Without '#', at most 20, 1 to 30 characters each, no whitespace, none twice whatever the case.
  hashtags: string[];
  // The app's own: the main server does not take it, and the phone keeps it.
  courseLevel: 'undergraduate' | 'graduate';
  // The app's own, as the course level.
  gender: Gender | null;
}

// --- Lobby (POST /lobby) ---

// An open pull request of the main server adds `masterSwitch` to it.
export interface Lobby {
  profile: { name: string; department: string; admissionYear: number | null; hashtags: string[] };
}

// --- Friends and their positions ---

// Provisional: GET /friends, in the order of the names.
export interface Friend {
  // The Friend's User id.
  id: string;
  name: string;
  department: string;
  // The User's own switch for this friendship.
  sharing: boolean;
  // Whether the User can see the Friend on the map now, never why not.
  visible: boolean;
}

// Provisional: GET /positions, the positions the User may see now. A User without one is absent.
export interface Position {
  userId: string;
  latitude: number;
  longitude: number;
  measuredAt: string;
}

export type Presence = 'free' | 'class' | 'moving' | 'off';

// The app's own: what the frame's friend list and card show and no answer holds.
export interface FriendStatus {
  userId: string;
  presence: Presence;
  // "중앙도서관"; "" for a Friend whose location is off.
  where: string;
  // "공강 · 중앙도서관 근처 · 15:00까지 비어 있어요"
  detail: string;
  // "도보 4분": how far the Friend is from the User. "" when it is not known.
  walk: string;
  // An image address. Null shows the name's letters.
  photo: string | null;
}

// --- Quests ---

// Provisional: one Sub Quest of GET /quests.
export interface SubQuest {
  id: string;
  attending: boolean;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  place: { placeId: string | null; label: string; latitude: number; longitude: number } | null;
  completion: 'by_time' | 'by_hand';
  cancelled: boolean;
  done: boolean;
  ended: boolean;
}

// Provisional: GET /quests. The User's Quests, then today's Class Quests by their start.
export interface Quest {
  id: string;
  title: string;
  globalEvent: { id: string; title: string } | null;
  holders: { id: string; name: string; department: string }[];
  // The attending one first.
  subQuests: SubQuest[];
  // True for a Class Quest, which the timetable makes for today.
  classQuest: boolean;
}

// --- What is on the map ---

// The app's own as a list: no route lists the published Global Events for a User yet. The fields are those the main
// server stores for one.
export interface GlobalEvent {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  // "301동 대강당"
  place: string | null;
  latitude: number;
  longitude: number;
  sourceUrl: string | null;
}

export type JoinPolicy = 'open' | 'approval' | 'closed';

// Provisional: the Quest a Party is marked with. Where and when the Party meets are that Quest's, not the Party's.
export interface PartyMark {
  questId: string;
  title: string;
  globalEvent: { id: string; title: string } | null;
}

// Provisional: one Party of GET /parties, the newest first. The list never holds a closed Party.
export interface Party {
  id: string;
  title: string;
  // 1 to 8.
  capacity: number;
  joinPolicy: JoinPolicy;
  memberCount: number;
  // Null once the Quest is deleted.
  mark: PartyMark | null;
}

// Provisional: GET /parties/mine, the Party the User is in now. The frame's "활성 파티".
export interface MyParty {
  id: string;
  title: string;
  capacity: number;
  joinPolicy: JoinPolicy;
  mark: PartyMark | null;
  // The User's own switch for sharing a position with this Party.
  sharing: boolean;
  // In the order they joined, the User among them.
  members: { id: string; name: string; department: string; leader: boolean; visible: boolean }[];
}

// --- Walking route (GET /walking-route) ---

export type NoRouteStatus =
  | 'SAME_POINT'
  | 'START_LINK_NOT_FOUND'
  | 'END_LINK_NOT_FOUND'
  | 'TOO_MANY_SEARCH_LINK'
  | 'TOO_FAR_AWAY'
  | 'ROUTE_RESULT_NOT_FOUND';

// The distance is in metres and the duration in seconds.
export type WalkingRoute =
  | { status: 'OK'; route: { line: LatLng[]; distance: number; duration: number } }
  | { status: NoRouteStatus; route: null };
