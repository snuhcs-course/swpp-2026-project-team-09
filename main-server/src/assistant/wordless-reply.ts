/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Lookup } from './dto/answer.dto.js';
import { type Presented } from './feature.js';
import { withToward } from './gathering/answer-words.js';
import { wordlessMealSentence } from './gathering/plan-reply.js';
import { wordlessStudySentence } from './lookup/study-plan-words.js';

// What a reply says when no step of the model wrote any text: nothing beside a Lookup, whose lines the app draws as
// the reply's words and sends back as what it said; over a meal or study answer with plans, the rules' one sentence
// made from them (P05 ticket 48, P10 ticket 04); the fixed sentence over anything else it shows, or a Lookup with no lines, so that no reply goes
// back empty; and no reply at all when it shows nothing.

export const FIXED_SENTENCE = '아래에서 확인해 보세요.';

const hasWords = ({ lines }: Lookup): boolean => lines.some((line) => line.some(({ text }) => text.trim() !== ''));

export function wordlessText({
  cards,
  mapButtons,
  proposal,
  answer,
  lookup,
  refusal,
  select,
}: Presented): string | null {
  // A plan chosen in words (P05 ticket 51), on the answer kept or on the reply's new one: the one sentence its rule asks
  // for.
  if (select !== undefined && (answer === null || answer.plans.some(({ id }) => id === select))) {
    return `${withToward(select)} 골랐어요.`;
  }
  const others = cards.length > 0 || mapButtons.length > 0 || proposal !== null || answer !== null;
  if (!others && lookup === null) {
    return null;
  }
  if (!others && lookup !== null && refusal === null && hasWords(lookup)) {
    return '';
  }
  return wordlessMealSentence(answer) ?? wordlessStudySentence(answer) ?? FIXED_SENTENCE;
}

// Whether a reply with no words of the model's is logged as a warning: not beside a Lookup's lines, nor over a menu's
// answer opened at its Restaurant, which have none by their rules, so that the real cases stand out.
export const warnsOfNoText = ({ answer }: Presented, text: string): boolean =>
  text !== '' && answer?.opened === undefined;
