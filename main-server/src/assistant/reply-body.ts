/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type LeftOutClass } from './dto/answer.dto.js';
import { type AssistantReplyDto } from './dto/assistant-messages.dto.js';
import { type ClientCapability, type FeatureReply } from './feature.js';
import { requestKey } from './presented.js';

// The reply the app gets of a run: offers and steps only when there are some, and the plan chosen in words when the
// answer the app shows next holds it: the one on screen, kept under a reply with no answer of its own, or the reply's
// new one, which the app then opens at it (P05 ticket 51). The Classes left out are given back while the request sent
// some (`sent`) or a tool changed them (P05 ticket 70). An app that says `answers` also gets every answer of the
// message with its request's key, the keys of the requests that ended with none, and which request holds the plan
// chosen (P05 ticket 73).
export function replyBody(
  reply: FeatureReply,
  sent?: readonly LeftOutClass[],
  capabilities: readonly ClientCapability[] = [],
): AssistantReplyDto {
  const { text, mapButtons, cards, proposal, answer, lookup, refusal, offers = [], steps, select, clears } = reply;
  const answers = capabilities.includes('answers') ? (reply.answers ?? []).map((each) => keyed(each)) : null;
  const withdrawn = answers === null ? [] : (reply.withdrawn ?? []);
  const skipped = reply.leftOut ?? (sent === undefined || sent.length === 0 ? undefined : [...sent]);
  const drawn =
    answer !== null ||
    (answers?.length ?? 0) > 0 ||
    lookup !== null ||
    cards.length > 0 ||
    proposal !== null ||
    steps !== undefined;
  const chosen = select !== undefined && (answer === null || answer.plans.some(({ id }) => id === select));
  const key = chosen && answers !== null ? holding(answers, select) : null;
  return {
    text,
    mapButtons,
    cards,
    proposal,
    answer,
    ...(answers === null ? {} : { answers }),
    ...(withdrawn.length === 0 ? {} : { withdrawn }),
    lookup,
    refusal,
    ...(offers.length === 0 ? {} : { offers }),
    ...(steps === undefined ? {} : { steps }),
    ...(chosen ? { select: { planId: select, ...(key === null ? {} : { key }) } } : {}),
    ...(clears === true && !drawn && mapButtons.length === 0 ? { clears } : {}),
    ...(skipped === undefined ? {} : { skipped }),
  };
}

const keyed = (answer: AnswerReply): AnswerReply => ({ ...answer, key: requestKey(answer.input) });

// The key of the last answer that holds the plan: the one drawn after any other of the same Restaurant or place.
function holding(answers: readonly AnswerReply[], planId: string): string | null {
  return answers.findLast(({ plans }) => plans.some(({ id }) => id === planId))?.key ?? null;
}
