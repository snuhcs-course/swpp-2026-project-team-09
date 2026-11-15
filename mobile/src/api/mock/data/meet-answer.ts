/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import type { MeetInput } from '@/api/meet-plan-types';
import { isAnswerReply } from '@/api/server/plan-answers';
import answer from './meet-answer.json';

// The main server's answer to "만나고 싶다" with 민수 (the design's board a5), asked on Tuesday 2026-11-17 at 12:10 from
// 301동, written by its own calculation and words on the seed's Places, walking table, and study spaces, with the
// Restaurants of 301동, 302동, and 학생회관 open, and the users' ids those of `meal-answer.ts`.
function checked(copy: unknown): AnswerReply & { input: MeetInput } {
  if (!isAnswerReply(copy) || copy.input.kind !== 'meet') {
    throw new Error('The stored answer of a meet fails the check of a reply');
  }
  return { ...copy, input: copy.input };
}

export const MEET_ANSWER = checked(answer);
