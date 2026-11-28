/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import { offeredAnswer } from './meal-offered';
import type { ChatBubble } from './use-chat';

// Whether a reply holds the answer on screen (`ShownAnswer.source`): its one answer, or one of its answers by key, the
// answer of the step chosen (P03 ticket 21), as given or as the app offers it (`offeredAnswer`).
export function holdsAnswer(
  { answer, answers = [] }: Pick<ChatBubble, 'answer' | 'answers'>,
  source: AnswerReply | null,
): boolean {
  if (source === null) {
    return false;
  }
  return [answer, ...answers].some(
    (each) => each !== undefined && each !== null && (each === source || offeredAnswer(each) === source),
  );
}
