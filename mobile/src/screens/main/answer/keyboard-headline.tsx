/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLine } from '@/api/assistant-types';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { keepsShown } from '@/features/assistant/use-shown-answer';
import { markdownLabel } from '../chat-markdown';
import type { ChatSheetControl } from '../chat-sheet';
import { linesOf } from './plan-card';
import { offeredAnswer } from '@/features/assistant/meal-offered';

// The first line of some words, without the Markdown's markers.
export function wordsLine(words: string): AnswerLine {
  const line = markdownLabel(words)
    .split('\n')
    .find((one) => one.trim() !== '');
  return [{ text: line ?? '', strong: false }];
}

// A reply's headline, as the frame's card draws the reply (`Words`): for the reply whose answer is on screen, the
// first line its Plan's card draws; for the reply whose Lookup is on screen, the Lookup's title, its first line;
// otherwise the first of the reply's lines, or of its words.
export function headlineOf(reply: ChatBubble, control: Pick<ChatSheetControl, 'answer' | 'lookup'>): AnswerLine {
  const { answer: shown, lookup: onScreen } = control;
  const { answer, refusal = null } = reply;
  const keeps = keepsShown(reply);
  const fromReply = answer !== undefined && answer !== null && offeredAnswer(answer) === shown.source;
  if ((fromReply || keeps) && shown.answer !== null) {
    const over = keeps ? refusal?.lines[0] : undefined;
    // The card says nothing of a Plan at rest, but the headline over the keyboard names it, the map being covered.
    const said = linesOf(shown, shown.answer)[0] ?? shown.plan?.lines[0];
    return over ?? said ?? wordsLine(reply.text);
  }
  const lookup = keeps ? onScreen.lookup : (reply.lookup ?? null);
  if (lookup !== null && lookup === onScreen.lookup) {
    return (refusal?.lines ?? lookup.lines)[0] ?? wordsLine(reply.text);
  }
  const lines = refusal?.lines ?? answer?.plans[0]?.lines ?? answer?.noPlan?.lines ?? reply.lookup?.lines;
  return lines?.[0] ?? wordsLine(reply.text);
}
