/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ApiClient } from './client';
import type { QuestChange, QuestMaking, RecruitingQuest } from './party-types';
import type { Person, Quest } from './types';
import type { JoinRequest, QuestInvitation, QuestSummary } from './waiting-types';

// The parts of a Quest that the wireframe draws and the main server does not give yet. The app adds them to the
// client's answers from mock adapters of its own (`./quest-parts/`), in the mock build and the server build alike.

// A Quest's photo. The mock's are drawn as the wireframe draws a photo it has no picture for: a tinted square with an
// icon and a caption. One the User picked from the camera or the album is a file on the phone.
export type QuestPhoto =
  | { kind: 'drawn'; tint: string; icon: 'flag' | 'users'; caption: string }
  | { kind: 'picked'; uri: string; caption: string };

// One member as a summary shows them. A photo is an image address; null shows the name's letters. The app has no
// pictures of people yet, so every face shows letters.
export interface MemberFace {
  name: string;
  photo: string | null;
}

export interface QuestParts {
  photo: QuestPhoto | null;
  // Without '#'.
  tags: string[];
  // Up to three members, the Leader first; for an invitation, the Leader and the companions.
  faces: MemberFace[];
}

// What a User enters for a Quest they make or change. The phone keeps it: nobody else sees it.
export interface QuestEntries {
  photo: QuestPhoto | null;
  tags: string[];
}

// An organisation gathering people, which 찾기's banner and 전체 파티's `공식` show. Its words stand in for what the
// organisation would write, as the frame's do.
export interface OfficialRecruiting {
  id: string;
  // "총학생회"
  org: string;
  // The banner's title, which may break into two lines at '\n'.
  title: string;
  subtitle: string;
  photo: QuestPhoto;
  time: string;
  place: string;
  // "[N]명 모집", "2인 1팀"
  fill: string;
  // Who holds it, in place of its members: "총학생회 주관".
  host: string;
  // The User said they join, on this phone.
  joined: boolean;
}

// A student looking for company without a post, which 찾기's `같이 할 사람을 찾는 중` shows.
export interface CompanionSeeker {
  id: string;
  name: string;
  // "산업공학과 23"
  department: string;
  // What they want to do, in their words.
  want: string;
  // Without '#'.
  tags: string[];
  // When they and the User are both free: "수 16:00 이후".
  freeTogether: string;
  // The User asked them on this phone.
  asked: boolean;
}

export type ShownQuest = Quest & QuestParts;
export type ShownRecruitingQuest = RecruitingQuest & QuestParts;
// What an invitation's card says of the plan besides its Quest, which the main server's invitation does not carry yet:
// when the Quest's next Sub Quest starts and where. Null where the build leaves it out (the server build, always).
export interface InvitationPlan {
  startsAt: string | null;
  place: string | null;
}

export type ShownQuestInvitation = Omit<QuestInvitation, 'quest'> & {
  quest: QuestSummary & QuestParts;
} & InvitationPlan;

// A request to join with the note its User wrote, which the Leader reads in the room; null where none is known.
export type ShownJoinRequest = JoinRequest & { note: string | null };

// One message of a room's 파티 채팅. `from` is null for the User's own.
export interface PartyMessage {
  id: string;
  from: { id: string; name: string } | null;
  words: string;
  sentAt: string;
}

// The operations whose answers carry the parts, or that take what the User enters.
export type PartsOperation =
  | 'listQuests'
  | 'getQuest'
  | 'joinQuest'
  | 'makeQuest'
  | 'attendGlobalEvent'
  | 'changeQuest'
  | 'acceptInvitation'
  | 'listRecruitingQuests'
  | 'listQuestInvitations'
  | 'listJoinRequests';

// The client the screens ask: the main server's answers, or the mock's, with the parts added, and the User's tags.
export type ShownClient = Omit<ApiClient, PartsOperation> & {
  listQuests: () => Promise<ShownQuest[]>;
  getQuest: (questId: string) => Promise<ShownQuest>;
  joinQuest: (questId: string) => Promise<ShownQuest>;
  // The photo and the tags left out keep none.
  makeQuest: (making: QuestMaking & Partial<QuestEntries>, idempotencyKey: string) => Promise<ShownQuest>;
  // As `makeQuest`: the photo and the tags left out keep none.
  attendGlobalEvent: (globalEventId: string, title?: string, entries?: Partial<QuestEntries>) => Promise<ShownQuest>;
  // The photo or the tags left out stay as they were.
  changeQuest: (questId: string, change: QuestChange & Partial<QuestEntries>) => Promise<ShownQuest>;
  acceptInvitation: (invitationId: string) => Promise<ShownQuest>;
  listRecruitingQuests: (filter?: Parameters<ApiClient['listRecruitingQuests']>[0]) => Promise<ShownRecruitingQuest[]>;
  listQuestInvitations: () => Promise<ShownQuestInvitation[]>;
  // The User's own tags, without '#', which the form offers and 찾기 orders the posts by.
  listMyTags: () => Promise<string[]>;
  listJoinRequests: (questId: string) => Promise<ShownJoinRequest[]>;
  // The room's 파티 채팅, the oldest first, and sending to it. The phone keeps what the User sends.
  listPartyChat: (questId: string) => Promise<PartyMessage[]>;
  sendPartyChat: (questId: string, words: string) => Promise<PartyMessage>;
  // The User's past Quests, which 내 파티 shows under `지난 일정`: the main server keeps no ended Quest yet. `me` is the
  // User, who holds each of them.
  listPastQuests: (me: Person) => Promise<ShownQuest[]>;
  // Official recruiting; none in the build that asks the main server, since it would name organisations that gather
  // nobody.
  listOfficialRecruiting: () => Promise<OfficialRecruiting[]>;
  // Kept on the phone.
  joinOfficialRecruiting: (recruitingId: string) => Promise<void>;
  // The posts the User hid with `관심 없음`, by Quest id, kept on the phone.
  listHiddenPosts: () => Promise<string[]>;
  hidePost: (questId: string) => Promise<void>;
  // People looking for company; none in the build that asks the main server, since they are not real people.
  listCompanionSeekers: () => Promise<CompanionSeeker[]>;
  // Kept on the phone.
  askCompanionSeeker: (seekerId: string) => Promise<void>;
};
