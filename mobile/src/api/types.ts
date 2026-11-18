/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The answers of the main server, as the app reads them; `src/api/server/answers.ts` checks them. A shape marked "the
// app's own" is defined nowhere else yet, and a mock answers it. All times are ISO 8601 instants and all positions a
// latitude and a longitude in degrees.

export interface LatLng {
  latitude: number;
  longitude: number;
}

// --- Sign-in (POST /auth/google) ---

// The name and the department that the SNU account gives, which Onboarding shows fixed. A part it does not give is
// null.
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
  // The SNU account's, which the main server stores whatever is sent; empty where the account gives none.
  name: string;
  department: string;
  // Null for "그 외" and for no choice.
  admissionYear: number | null;
  // Without '#', at most 20, 1 to 30 characters each, no whitespace, none twice whatever the case.
  hashtags: string[];
  // The app's own: the main server does not take it, and the phone keeps it.
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
  // For a group study room's booking only, and in no other User's view. The 학번 as its nine digits, and the 학적상
  // 이름, which is taken to be the name while it is null.
  studentNumber: string | null;
  registeredName: string | null;
  affiliation: Affiliation | null;
}

// 소속: 학부, 대학원 or 교환학생.
export type Affiliation = 'undergraduate' | 'graduate' | 'exchange';

export interface Lobby {
  profile: Profile;
  // Whether the User's Master Switch is on.
  masterSwitch: boolean;
  // Whether the app has asked the User, before they turned the Master Switch off, whether to show the building instead.
  masterOffAsked: boolean;
}

// The fields of the profile that change; a field left out stays. `null` empties the admission year and the 소속, and an
// empty text the 학번 and the 학적상 이름. The 학번 may hold the hyphen, as the User typed it.
// The name and the department are the SNU account's, so an edit does not hold them.
export type ProfileChange = Partial<
  Pick<Profile, 'admissionYear' | 'hashtags' | 'studentNumber' | 'registeredName' | 'affiliation'>
>;

// --- Friends and their positions ---

// What a User lets a Friend see of where they are, above the Timetable every Friend sees: "시간표만", "지금 있는 건물",
// or "정확한 위치". The Friend sees the lower of the two ends.
export type FriendLevel = 'timetable' | 'building' | 'exact';

// GET /friends, in the order of the names.
export interface Friend {
  // The Friend's User id.
  id: string;
  name: string;
  department: string;
  // The User's own end of this friendship.
  level: FriendLevel;
  // What the two see of each other by the friendship: the lower of the two ends, the Timetable while either Master
  // Switch is off. The only word on the Friend's own end.
  seen: FriendLevel;
  // Whether the User's end is above the Timetable.
  sharing: boolean;
  // Whether the User can see the Friend on the map now, never why not.
  visible: boolean;
  // Whether the app has asked the User about this Friend: before turning location off for them, and after a Plan with
  // them became a Quest. Each is asked once.
  askedOff: boolean;
  askedPlan: boolean;
  // The Friend's own Friend ID, "7KX2M9QD", and when the two became Friends, in ISO 8601 with Korea's offset. Left
  // out until the main server sends them.
  friendId?: string;
  friendsSince?: string;
}

// The two moments the app asks a User about a Friend at, which the main server keeps.
export type AskedMoment = 'off' | 'plan';

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
  // At 'building' the User sees only the Place the Friend is in: the point is the Place's own, and `placeId` names it.
  level?: 'building' | 'exact';
  placeId?: string;
  // Only GET /positions gives these two; the socket's `position` does not. The name of the Place nearest the Friend,
  // and the walk to it in minutes from the Place nearest the User's own last position, by the main server's walking
  // table: 0 when both are the same Place. Null when the main server does not know it.
  nearPlace?: string | null;
  walkMinutes?: number | null;
}

// POST /positions: the User's own position. `accuracy` is the radius in metres the phone places itself within, and
// `measuredAt` the time the phone measured it.
export interface PositionUpload {
  latitude: number;
  longitude: number;
  accuracy: number;
  measuredAt: string;
}

// The answer to an upload: a position off the Campus Boundary, or inside one of the User's Private Zones, was not
// kept, and the User is not shared. A main server older than the zones leaves `privateZone` out: false.
export interface PositionKept {
  offCampus: boolean;
  privateZone?: boolean;
}

// `on` is a Friend the User can see who has no status: all the main server says is that the position is shared.
export type Presence = 'free' | 'class' | 'moving' | 'on' | 'off';

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
  // Words alone, which name no Place, have no position.
  place: { placeId: string | null; label: string; latitude: number | null; longitude: number | null } | null;
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

// Where an Open or Approval Quest is posted: 식사, 진로, 취미 or 공연 게시판.
export type Board = 'meal' | 'career' | 'hobby' | 'show';

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
  // True for a Quest taken alone ("여기로", a booked seat), which is never a 파티; absent from a server before it.
  takenAlone?: boolean;
  // The requests to join waiting for the Leader's answer, when the User leads the Quest; 0 otherwise.
  waitingJoinRequests: number;
  // Null for a Closed Quest and a Class Quest.
  board: Board | null;
  // The recruiting post, 0 to 200 characters.
  description: string;
  // Null for a Class Quest.
  createdAt: string | null;
  // The Holders in the order they entered, then the invited, then the declined; none for a Class Quest. A main server
  // before members sends none.
  members?: QuestMember[];
}

export type MemberState = 'invited' | 'accepted' | 'late' | 'declined';

export interface QuestMember {
  user: Person;
  state: MemberState;
  // Set with 'late' only.
  lateMinutes: number | null;
}

// --- What is on the map ---

// A published Global Event, as the Assistant's cards carry it, and the list without what is the User's own.
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

// GET /global-events: the published Global Events that have not ended, by their start, with what is the User's own.
export interface ListedGlobalEvent extends GlobalEvent {
  // When it was published; null for one published before the main server recorded it.
  publishedAt: string | null;
  // The User starred it: a Favorite Event, which stays on the map until it ends.
  favorite: boolean;
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
  // The Party's Leader now; the main server always sends it, and `isParties` refuses a Party without one.
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
