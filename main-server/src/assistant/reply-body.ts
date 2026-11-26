/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AssistantReplyDto } from './dto/assistant-messages.dto.js';
import { type FeatureReply } from './feature.js';

// The reply the app gets of a run: offers and steps only when there are some, and the plan chosen in words only beside
// no answer of the reply's own, since a new answer is shown at its own first plan (P05 ticket 51).
export function replyBody(reply: FeatureReply): AssistantReplyDto {
  const { text, mapButtons, cards, proposal, answer, lookup, refusal, offers = [], steps, select } = reply;
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
    ...(select === undefined || answer !== null ? {} : { select: { planId: select } }),
  };
}
