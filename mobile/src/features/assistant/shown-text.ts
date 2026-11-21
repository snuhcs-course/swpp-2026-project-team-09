/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLine } from '@/api/assistant-types';
import type { ChatBubble } from './use-chat';

function wordsOf(lines: readonly AnswerLine[]): string {
  return lines.map((parts) => parts.map(({ text }) => text).join('')).join('\n');
}

// What the User saw of an Assistant's reply. The card draws the lines of an answer or a Lookup, under the steps of a
// message that asked for several things, in place of the model's text: so those are what the reply said, and the model
// never reads back, and takes back, a sentence the User did not see.
export function shownText({
  text,
  answer,
  lookup,
  steps = [],
}: Pick<ChatBubble, 'text' | 'answer' | 'lookup' | 'steps'>): string {
  const lines = answer?.plans[0]?.lines ?? answer?.noPlan?.lines ?? lookup?.lines;
  if (lines === undefined) {
    return text;
  }
  const stepWords = steps.map(
    ({ title, status, reason }, index) =>
      `${index + 1}. ${title}${status === 'not-done' && reason !== null ? ` · ${reason}` : ''}`,
  );
  const words = [...stepWords, wordsOf(lines)].join('\n').trim();
  return words === '' ? text : words;
}
