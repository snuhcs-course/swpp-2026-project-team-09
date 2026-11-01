/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { z } from 'zod';
import { type TutorialQuest } from '../tutorial-content.js';
import { type QuestStatus, type TutorialState } from '../tutorial-state.js';

// The answer of GET /tutorial and of every POST under it: the content as the file holds it, and the User's status of
// each quest. It names no User. `rowHidden` is the ✕ of the 내 정보 row, cleared by turning the tutorial on;
// `eligibleByDefault` is the rule read now, so the app has no copy of it.
export interface TutorialDto {
  state: TutorialState;
  rowHidden: boolean;
  eligibleByDefault: boolean;
  quests: (TutorialQuest & { status: QuestStatus })[];
}

export const completeQuestSchema = z.strictObject({ by: z.enum(['button', 'checked', 'forced', 'skipped']) });

export type CompleteQuestDto = z.infer<typeof completeQuestSchema>;
