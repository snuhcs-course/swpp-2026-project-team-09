/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import { isAnswerReply } from '@/api/server/plan-answers';
import answer from './new-quest-answer.json';

// The main server's answer to "새로 모집" after a search for badminton, asked on Thursday 2026-11-19 at 16:45 (the
// design's row 5, section 6.4) and copied whole, with the asker's id renamed to that of `meal-answer.ts`: a new party
// at the gymnasium at 17:10 with 서준, the asker by shuttle.
function checked(copy: unknown): AnswerReply {
  if (!isAnswerReply(copy)) {
    throw new Error('The stored answer of a new recruiting Quest fails the check of a reply');
  }
  return copy;
}

export const NEW_QUEST_ANSWER = checked(answer);
