/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Feature, type FeatureReply, type ToolContext } from './feature.js';
import { askedReply } from './past-time.js';
import { keptRefusal, lookupBeside } from './refusals/refusals.js';
import { saidText, warnsOfNoText, wordlessText } from './wordless-reply.js';

// The reply of a run that ended, once the feature has changed what it presented: the model's text, a refusal's lines
// without any, or what a reply with no words says (wordlessText). A run that asked back about a time that has passed
// replies with the question alone, and the feature changes nothing (P05 ticket 80).
export async function replyOf(
  text: string,
  finishReason: string,
  feature: Feature,
  context: ToolContext,
): Promise<FeatureReply | null> {
  const asked = askedReply(context.presented);
  if (asked !== null) {
    return asked;
  }
  await feature.afterRun?.(context);
  const presented = { ...context.presented, cards: feature.cardsAfterRun?.(context) ?? context.presented.cards };
  presented.refusal = keptRefusal(presented);
  presented.lookup = lookupBeside(presented);
  if (presented.answer !== null || presented.lookup !== null || presented.refusal !== null) {
    delete presented.offers;
  }
  const said = saidText(text, presented);
  if (said !== '') {
    return { ...presented, text: said, noTextFinishReason: null };
  }
  const wordless = wordlessText(presented);
  if (wordless === null) {
    return null;
  }
  return { ...presented, text: wordless, noTextFinishReason: warnsOfNoText(presented, wordless) ? finishReason : null };
}
