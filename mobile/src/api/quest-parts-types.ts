/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { AssistantReply, GlobalEventCard, LibraryCard, QuestCard, RestaurantCard } from './assistant-types';
import type { ApiClient } from './client';
import type { QuestChange, QuestMaking, RecruitingQuest } from './party-types';
import type { Person, Quest } from './types';
import type { JoinRequest, QuestInvitation, QuestSummary } from './waiting-types';

// The parts of a Quest that the wireframe draws and the main server does not give yet. The app adds them to the
// client's answers from mock adapters of its own (`./quest-parts/`), in the mock build and the server build alike.

// An official recruiting's photo, drawn as the wireframe draws a photo it has no picture for: a tinted square with an
// icon and a caption.
export interface QuestPhoto {
  kind: 'drawn';
  tint: string;
  icon: 'flag' | 'users';
  caption: string;
}

// One member as a summary shows them. A photo is an image address; null shows the name's letters. The app has no
// pictures of people yet, so every face shows letters.
export interface MemberFace {
  name: string;
  photo: string | null;
}

export interface QuestParts {
  // Up to three members, the Leader first; for an invitation, the Leader and the companions.
  faces: MemberFace[];
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
// The Assistant's reply, its Quest cards with their parts as the Boards draw them.
export type ShownQuestCard = Omit<QuestCard, 'quest'> & { quest: ShownRecruitingQuest };
export type ShownChatCard = GlobalEventCard | ShownQuestCard | RestaurantCard | LibraryCard;
export type ShownAssistantReply = Omit<AssistantReply, 'cards'> & { cards: ShownChatCard[] };
export type ShownQuestInvitation = Omit<QuestInvitation, 'quest'> & {
  quest: QuestSummary & QuestParts;
};

// A request to join with the note its User wrote, which the Leader reads in the room; null where none is known.
export type ShownJoinRequest = JoinRequest & { note: string | null };

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
  | 'listJoinRequests'
  | 'askAssistant';

// The client the screens ask: the main server's answers, or the mock's, with the parts added.
export type ShownClient = Omit<ApiClient, PartsOperation> & {
  listQuests: () => Promise<ShownQuest[]>;
  getQuest: (questId: string) => Promise<ShownQuest>;
  joinQuest: (questId: string) => Promise<ShownQuest>;
  makeQuest: (making: QuestMaking, idempotencyKey: string) => Promise<ShownQuest>;
  attendGlobalEvent: (globalEventId: string, title?: string) => Promise<ShownQuest>;
  changeQuest: (questId: string, change: QuestChange) => Promise<ShownQuest>;
  acceptInvitation: (invitationId: string) => Promise<ShownQuest>;
  listRecruitingQuests: (filter?: Parameters<ApiClient['listRecruitingQuests']>[0]) => Promise<ShownRecruitingQuest[]>;
  listQuestInvitations: () => Promise<ShownQuestInvitation[]>;
  listJoinRequests: (questId: string) => Promise<ShownJoinRequest[]>;
  askAssistant: (...args: Parameters<ApiClient['askAssistant']>) => Promise<ShownAssistantReply>;
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
