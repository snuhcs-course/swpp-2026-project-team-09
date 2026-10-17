/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ApiClient } from './client';
import type { QuestChange, QuestMaking, RecruitingQuest } from './party-types';
import type { Quest } from './types';
import type { QuestInvitation, QuestSummary } from './waiting-types';

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
  // The 관련 행사 chosen when editing, which the main server cannot change: it then shows instead of the Quest's own.
  // Left out, the Quest's own shows.
  event?: { id: string; title: string } | null;
}

// What making a Quest takes: its event is the one it is made for.
export type MadeEntries = Pick<QuestEntries, 'photo' | 'tags'>;

export type ShownQuest = Quest & QuestParts;
export type ShownRecruitingQuest = RecruitingQuest & QuestParts;
export type ShownQuestInvitation = Omit<QuestInvitation, 'quest'> & { quest: QuestSummary & QuestParts };

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
  | 'listQuestInvitations';

// The client the screens ask: the main server's answers, or the mock's, with the parts added, and the User's tags.
export type ShownClient = Omit<ApiClient, PartsOperation> & {
  listQuests: () => Promise<ShownQuest[]>;
  getQuest: (questId: string) => Promise<ShownQuest>;
  joinQuest: (questId: string) => Promise<ShownQuest>;
  // The photo and the tags left out keep none.
  makeQuest: (making: QuestMaking & Partial<MadeEntries>, idempotencyKey: string) => Promise<ShownQuest>;
  // As `makeQuest`: the photo and the tags left out keep none.
  attendGlobalEvent: (globalEventId: string, title?: string, entries?: Partial<MadeEntries>) => Promise<ShownQuest>;
  // The photo, the tags or the event left out stay as they were.
  changeQuest: (questId: string, change: QuestChange & Partial<QuestEntries>) => Promise<ShownQuest>;
  acceptInvitation: (invitationId: string) => Promise<ShownQuest>;
  listRecruitingQuests: (filter?: Parameters<ApiClient['listRecruitingQuests']>[0]) => Promise<ShownRecruitingQuest[]>;
  listQuestInvitations: () => Promise<ShownQuestInvitation[]>;
  // The User's own tags, without '#', which the form offers and 찾기 orders the posts by.
  listMyTags: () => Promise<string[]>;
};
