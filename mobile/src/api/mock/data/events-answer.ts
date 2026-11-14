/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import { isAnswerReply } from '@/api/server/plan-answers';
import answer from './events-answer.json';

// The main server's answer to "오늘 볼 만한 거 있어?", asked on Friday 2026-11-20 at 13:50 (the design's worked example
// of events) and copied whole, with the asker's id renamed to that of `meal-answer.ts`: the job fair, the concert by
// shuttle, and the company session that clashes with the 15:30 Class.
function checked(copy: unknown): AnswerReply {
  if (!isAnswerReply(copy)) {
    throw new Error('The stored answer of events fails the check of a reply');
  }
  return copy;
}

export const EVENTS_ANSWER = checked(answer);
