/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLine } from '@/api/assistant-types';
import { modelWordsOf } from './model-words';
import type { ChatBubble } from './use-chat';

function wordsOf(lines: readonly AnswerLine[]): string {
  return lines.map((parts) => parts.map(({ text }) => text).join('')).join('\n');
}

// What the User saw of an Assistant's reply. The card draws the lines of an answer, under the steps of a message that
// asked for several things, in place of the model's text: so those are what the reply said, and the model never reads
// back, and takes back, a sentence the User did not see. Beside a Lookup the User sees the model's words and then the
// Lookup's lines (P04 ticket 18), so both go back, the words first; blank words leave the lines alone.
export function shownText({
  text,
  answer,
  lookup,
  steps = [],
}: Pick<ChatBubble, 'text' | 'answer' | 'lookup' | 'steps'>): string {
  const planned = answer?.plans[0]?.lines ?? answer?.noPlan?.lines;
  const lines = planned ?? lookup?.lines;
  if (lines === undefined) {
    return text;
  }
  const stepWords = steps.map(
    ({ title, status, reason }, index) =>
      `${index + 1}. ${title}${status === 'not-done' && reason !== null ? ` · ${reason}` : ''}`,
  );
  const own = modelWordsOf(text);
  const spoken = planned === undefined && own !== '' ? [own] : [];
  const words = [...stepWords, ...spoken, wordsOf(lines)].join('\n').trim();
  return words === '' ? text : words;
}
