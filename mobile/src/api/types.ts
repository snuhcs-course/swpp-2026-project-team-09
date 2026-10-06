// The answers of the main server, as the app reads them; `src/api/server/answers.ts` checks them. A shape marked "the
// app's own" is defined nowhere else yet, and a mock answers it. All times are ISO 8601 instants and all positions a
// latitude and a longitude in degrees.

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
  // Not an snu.ac.kr account: the main server's 403, or the app's own check where it asks no main server.
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

// --- Lobby (POST /lobby) and the profile (PATCH /users/me/profile) ---

export interface Profile {
  name: string;
  department: string;
  admissionYear: number | null;
  // Without '#'.
  hashtags: string[];
  // "7KX2M9QD": what another User sends a Friend Request to.
  friendId: string;
}

export interface Lobby {
  profile: Profile;
  // Whether the User's Master Switch is on.
  masterSwitch: boolean;
}

// The fields of the profile that change; a field left out stays. `null` empties the admission year.
export type ProfileChange = Partial<Pick<Profile, 'name' | 'department' | 'admissionYear' | 'hashtags'>>;

// --- Friends and their positions ---

// GET /friends, in the order of the names.
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

// Another User as a Friend ID, a Friend Request or an Invite Link names them.
export interface UserSummary {
  name: string;
  department: string;
}

// POST /friend-requests. `friends`: the owner's own request to the User was waiting, and the two are Friends now.
export interface SentFriendRequest {
  status: 'waiting' | 'friends';
}

// POST /invite-links: the link to send, which works once and for 24 hours.
export interface InviteLink {
  url: string;
  expiresAt: string;
}

// GET /invite-links/:token: who sent the link and whether the User asking can accept it. `own` is the User's own
// link, `friend` one from a Friend.
export interface OpenedInviteLink {
  sender: UserSummary;
  status: 'usable' | 'used' | 'expired' | 'own' | 'friend';
}

// GET /positions, and the socket's `position`: the positions the User may see now. A User without one is absent.
export interface Position {
  userId: string;
  latitude: number;
  longitude: number;
  measuredAt: string;
}

// POST /positions: the User's own position. `accuracy` is the radius in metres the phone places itself within, and
// `measuredAt` the time the phone measured it.
export interface PositionUpload {
  latitude: number;
  longitude: number;
  accuracy: number;
  measuredAt: string;
}

// The answer to an upload: a position off the Campus Boundary was not kept, and the User is not shared.
export interface PositionKept {
  offCampus: boolean;
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

// One Sub Quest of GET /quests.
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

export interface Person {
  id: string;
  name: string;
  department: string;
}

// GET /quests. The User's Quests, then today's Class Quests by their start.
export interface Quest {
  id: string;
  title: string;
  globalEvent: { id: string; title: string } | null;
  // Null for a Class Quest only.
  leader: Person | null;
  // 1 to 8: the most Holders the Quest takes.
  capacity: number;
  joinPolicy: JoinPolicy;
  holders: Person[];
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

// The Quest a Party is marked with. Where and when the Party meets are that Quest's, not the Party's.
export interface PartyQuest {
  id: string;
  title: string;
  globalEvent: { id: string; title: string } | null;
}

// GET /parties: the Parties the User may see and is not in, the newest first. The list never holds a closed Party.
export interface Party {
  id: string;
  title: string;
  memberCount: number;
  // 1 to 8.
  capacity: number;
  joinPolicy: JoinPolicy;
  // Null once the Quest is deleted.
  quest: PartyQuest | null;
  // Whether the User holds the Party's Quest.
  holdsQuest: boolean;
  // The User's Friends among the members, in the order they entered.
  friends: Person[];
  // Provisional: the Party's Leader now, from an open pull request of the main server (P08-16).
  leader?: { id: string; name: string };
}

// GET /parties/mine, the Party the User is in now; 404 NOT_IN_PARTY for a User in no Party. The frame's "활성 파티".
export interface MyParty {
  id: string;
  title: string;
  capacity: number;
  joinPolicy: JoinPolicy;
  quest: PartyQuest | null;
  // The User's own switch for sharing a position with this Party.
  sharing: boolean;
  // In the order they joined, the User among them.
  members: { id: string; name: string; department: string; leader: boolean; visible: boolean }[];
}

// The app's own: what the main screen's "오늘의 발자국" shows, which no answer of the main server holds. The `Main`
// frame counts the people who left a story today, the User left out, and draws the faces of the first three by the
// time of their story.
export interface Footprints {
  // How many Friends left a story today.
  friendCount: number;
  // The first three of them. A photo is an image address; null shows the name's letters.
  faces: { userId: string; name: string; photo: string | null }[];
}

// --- Timetable (GET /timetable/classes) and Places (GET /places) ---

export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

// A time of a class: in Korea's time, "10:30".
export interface ClassTime {
  id: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  placeId: string | null;
  // "118호", or null.
  room: string | null;
}

// In the order of their first time in the week, each time in the order of the week.
export interface TimetableClass {
  id: string;
  courseName: string;
  times: ClassTime[];
  // The other classes that cross this one.
  overlaps: { id: string; courseName: string }[];
}

export type ClassSave = Pick<TimetableClass, 'courseName'> & { times: Omit<ClassTime, 'id'>[] };

// A building of the campus, or a spot without a number.
export interface Place {
  id: string;
  // "301", or null for a spot such as 자하연.
  number: string | null;
  name: string;
  latitude: number;
  longitude: number;
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
