/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import { isAnswerReply } from '@/api/server/plan-answers';
import answer from './quests-answer.json';

// The main server's answer to "배드민턴 칠 사람", asked on Thursday 2026-11-19 at 16:45 (the design's row 5, section
// 6.4) and copied whole, with the asker's id renamed to that of `meal-answer.ts`: the 18:00 party at the gymnasium by
// shuttle, and the 17:00 party dropped, reached only at 17:02.
function checked(copy: unknown): AnswerReply {
  if (!isAnswerReply(copy)) {
    throw new Error('The stored answer of recruiting Quests fails the check of a reply');
  }
  return copy;
}

export const QUESTS_ANSWER = checked(answer);
