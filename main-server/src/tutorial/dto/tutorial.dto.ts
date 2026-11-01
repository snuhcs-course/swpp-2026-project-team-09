/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { z } from 'zod';
import { type TutorialQuest } from '../tutorial-content.js';
import { type QuestStatus, type TutorialState } from '../tutorial-state.js';

// The answer of GET /tutorial and of every POST under it: the content as the file holds it, and the User's status of
// each quest. It names no User.
export interface TutorialDto {
  state: TutorialState;
  quests: (TutorialQuest & { status: QuestStatus })[];
}

export const completeQuestSchema = z.strictObject({ by: z.enum(['button', 'checked', 'forced', 'skipped']) });

export type CompleteQuestDto = z.infer<typeof completeQuestSchema>;
