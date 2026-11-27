/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AssistantReplyDto } from './dto/assistant-messages.dto.js';
import { type FeatureReply } from './feature.js';

// The reply the app gets of a run: offers and steps only when there are some, and the plan chosen in words when the
// answer the app shows next holds it: the one on screen, kept under a reply with no answer of its own, or the reply's
// new one, which the app then opens at it (P05 ticket 51).
export function replyBody(reply: FeatureReply): AssistantReplyDto {
  const { text, mapButtons, cards, proposal, answer, lookup, refusal, offers = [], steps, select, clears } = reply;
  const drawn = answer !== null || lookup !== null || cards.length > 0 || proposal !== null || steps !== undefined;
  const chosen = select !== undefined && (answer === null || answer.plans.some(({ id }) => id === select));
  return {
    text,
    mapButtons,
    cards,
    proposal,
    answer,
    lookup,
    refusal,
    ...(offers.length === 0 ? {} : { offers }),
    ...(steps === undefined ? {} : { steps }),
    ...(chosen ? { select: { planId: select } } : {}),
    ...(clears === true && !drawn && mapButtons.length === 0 ? { clears } : {}),
  };
}
