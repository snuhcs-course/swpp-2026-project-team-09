/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, PlanInput, ReplyStep } from '@/api/assistant-types';
import type { ChatBubble } from './use-chat';
import { keepsShown } from './use-shown-answer';

// The answers of the conversation on screen, by the keys the main server gives them (P03 ticket 20). A reply to an app
// that says `answers` brings the answers it draws or changes, one per request: each takes the place of the one of its
// key, or comes after them, and an answer it does not name stays; the keys it withdrew leave. The steps are the last
// reply's, whole. A reply without `answers`, from a main server before P05 ticket 73 or to an app that does not say
// `answers`, gives its one answer, as the app always drew it. The key is opaque: the app compares it and never builds
// it.

export interface ConversationAnswers {
  // One per request, in the order first drawn.
  answers: readonly AnswerReply[];
  // As the last reply gave them, when it gave two or more; null otherwise.
  steps: readonly ReplyStep[] | null;
}

const NONE: ConversationAnswers = { answers: [], steps: null };

type Replied = Pick<ChatBubble, 'role' | 'failure' | 'own' | 'refusal' | 'answer' | 'answers' | 'withdrawn' | 'steps'>;

// A reply of the Assistant that draws: not a failure, not the app's own bubble, and not one that keeps what is on
// screen, as the answer on screen counts them (`lastReply`).
const isReply = (bubble: Replied): boolean =>
  bubble.role === 'assistant' && bubble.failure === null && bubble.own !== true && !keepsShown(bubble);

// The answers with this one in the place of the one of its key, or after them.
function withAnswer(answers: readonly AnswerReply[], answer: AnswerReply): AnswerReply[] {
  const at = answers.findIndex(({ key }) => key !== undefined && key === answer.key);
  return at === -1 ? [...answers, answer] : answers.with(at, answer);
}

// The conversation's answers after a reply.
export function afterReply(kept: ConversationAnswers, reply: Replied): ConversationAnswers {
  const steps = reply.steps ?? null;
  if (reply.answers === undefined) {
    return { answers: reply.answer === undefined || reply.answer === null ? [] : [reply.answer], steps };
  }
  const withdrawn = new Set(reply.withdrawn ?? []);
  const staying = kept.answers.filter(({ key }) => key === undefined || !withdrawn.has(key));
  return { answers: reply.answers.reduce((answers, answer) => withAnswer(answers, answer), staying), steps };
}

export function conversationAnswersOf(bubbles: readonly Replied[]): ConversationAnswers {
  return bubbles.reduce((kept, bubble) => (isReply(bubble) ? afterReply(kept, bubble) : kept), NONE);
}

const renamed = (step: ReplyStep, from: string, to: string): ReplyStep =>
  step.shows?.kind === 'answer' && step.shows.key === from ? { ...step, shows: { kind: 'answer', key: to } } : step;

// The conversation with the answer of key `from` recalculated: the recalculation's answer in its place, under the key
// it came back with, which a changed condition may have made another request's (a Friend added makes a study place one
// together); its step names it by that key.
export function withRecalculated(kept: ConversationAnswers, from: string, next: AnswerReply): ConversationAnswers {
  const to = next.key ?? from;
  const at = kept.answers.findIndex(({ key }) => key === from);
  if (at === -1) {
    return kept;
  }
  const answers = kept.answers.with(at, { ...next, key: to });
  const steps = to === from || kept.steps === null ? kept.steps : kept.steps.map((step) => renamed(step, from, to));
  return { answers, steps };
}

// The answer of the conversation that a recalculation replaced on screen: its key and its conditions now.
export interface ShownConditions {
  key: string;
  input: PlanInput;
}

// What a request tells of the steps on screen, for an app that says `answers`: the conditions of every answer of the
// steps in their order, the one on screen as recalculated, and the steps whole. Nothing without steps on screen, so
// that a single request is sent as before.
export function stepsContextOf(
  { answers, steps }: ConversationAnswers,
  shown: ShownConditions | null,
): { answers?: PlanInput[]; steps?: ReplyStep[] } {
  if (steps === null) {
    return {};
  }
  const inputs = steps.flatMap(({ shows }): PlanInput[] => {
    const key = shows?.kind === 'answer' ? shows.key : undefined;
    if (key === undefined) {
      return [];
    }
    if (shown?.key === key) {
      return [shown.input];
    }
    const answer = answers.find((each) => each.key === key);
    return answer === undefined ? [] : [answer.input];
  });
  return { answers: inputs, steps: [...steps] };
}
