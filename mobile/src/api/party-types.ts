/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { SubQuestContent } from './room-types';
import type { Board, JoinPolicy, SubQuest } from './types';
import type { QuestSummary } from './waiting-types';

// What the 파티 tab sends and reads besides the Quests and the lists of what waits.

// GET /quests/recruiting: an Open or Approval Quest that the User does not hold, with a Sub Quest ahead.
export interface RecruitingQuest extends QuestSummary {
  // The first Sub Quest ahead, in the Quest's order.
  nextSubQuest: Pick<SubQuest, 'id' | 'title' | 'startsAt' | 'endsAt' | 'place'>;
}

// POST /quests/own. `board` exactly when the Join Policy is not `closed`.
export interface QuestMaking {
  title: string;
  description: string;
  capacity: number;
  joinPolicy: JoinPolicy;
  board?: Board;
  subQuest: Partial<SubQuestContent> & { title: string };
}

// PATCH /quests/:questId: what changes, the rest left out.
export type QuestChange = Partial<Pick<QuestMaking, 'title' | 'description' | 'capacity' | 'joinPolicy' | 'board'>>;
