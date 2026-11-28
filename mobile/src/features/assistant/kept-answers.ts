/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import type { ChosenAnswer } from './answer-state';
import { type ConversationAnswers, conversationAnswersOf, withRecalculated } from './conversation-answers';
import type { ChatBubble } from './use-chat';

// What is kept of each step's answer on screen, by key (P03 ticket 21; moved from `use-step-answer.ts`), pure. One entry
// per step, and every entry is read through `keptOnScreen`, never raw: an entry a later reply gave again is gone for
// every reader, its `from` included (TaeHyun79's reviews of #725).

// What became of a step's answer on screen: recalculated (`answer`, null when it is the reply's), and the plan last on;
// `from` is the key it had when the reply gave it, and `after` the reply it was kept after.
export interface Kept {
  from: string;
  answer: AnswerReply | null;
  index: number;
  after: number;
}

// Whether a reply after the one a recalculation was kept after gave that answer again: the main server's is then newer.
const givenAgain = (bubbles: readonly ChatBubble[], kept: Kept, key: string): boolean =>
  bubbles.some(
    ({ id, answers = [] }) =>
      id > kept.after && answers.some((answer) => answer.key === kept.from || answer.key === key),
  );

// What is kept of each step's answer, less what a later reply gave again: the main server's answer is then newer, and
// it opens as that reply opens it (TaeHyun79's review of #725).
export function keptOnScreen(
  kept: ReadonlyMap<string, Kept>,
  bubbles: readonly ChatBubble[],
): ReadonlyMap<string, Kept> {
  const stale = [...kept].filter(([key, one]) => givenAgain(bubbles, one, key));
  return stale.length === 0 ? kept : new Map([...kept].filter(([key, one]) => !givenAgain(bubbles, one, key)));
}

// What is kept once the answer on screen of the step chosen, under `chosenKey`, became `answer` at plan `index`: one
// entry for the step, under the key its answer has now, with the key the reply gave it (`from`). The entry under the
// step's key before goes when a recalculation gave the answer another key, so that no earlier recalculation comes back
// after a second change, back to an earlier key (TaeHyun79's review of #725).
export function keptWith(
  last: ReadonlyMap<string, Kept>,
  chosenKey: string,
  { key, ...one }: Omit<Kept, 'from'> & { key: string },
  bubbles: readonly ChatBubble[],
): ReadonlyMap<string, Kept> {
  const onScreen = keptOnScreen(last, bubbles);
  const was = onScreen.get(key);
  if (key === chosenKey && was !== undefined && was.answer === one.answer && was.index === one.index) {
    return last;
  }
  const next = new Map(onScreen);
  next.delete(chosenKey);
  return next.set(key, { from: onScreen.get(chosenKey)?.from ?? chosenKey, ...one });
}

// The conversation's answers with each recalculation on screen in its place.
export function recalculatedConversation(
  given: ConversationAnswers,
  kept: ReadonlyMap<string, Kept>,
): ConversationAnswers {
  return [...kept].reduce(
    (conversation, [, one]) =>
      one.answer === null ? conversation : withRecalculated(conversation, one.from, one.answer),
    given,
  );
}

// The answer a step of that key shows: the reply's answer of it (`source`), by the key it had when a reply gave it, as
// last on screen. `kept` is `keptOnScreen`'s. Null when no reply gives it.
export function chosenAnswerOf(
  key: string,
  conversation: ConversationAnswers,
  kept: ReadonlyMap<string, Kept>,
  bubbles: readonly ChatBubble[],
): ChosenAnswer | null {
  const one = kept.get(key);
  const given = conversationAnswersOf(bubbles).answers.find((answer) => answer.key === (one?.from ?? key));
  const shown = conversation.answers.find((answer) => answer.key === key) ?? given;
  if (given === undefined || shown === undefined) {
    return null;
  }
  return { key, source: given, answer: shown, index: one?.index ?? null };
}
