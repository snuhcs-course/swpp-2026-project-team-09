/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type CardFact, type LookupCard } from '../dto/answer.dto.js';

// The card of a pressed Place or Friend, whose first fact is the strong one.

export const fact = (icon: CardFact['icon'], text: string, userId: string | null = null): CardFact => ({
  icon,
  text,
  strong: false,
  userId,
});

export function cardOf(
  title: string,
  subtitle: string | null,
  facts: readonly CardFact[],
  note: string | null,
): LookupCard {
  return { title, subtitle, facts: facts.map((each, index) => ({ ...each, strong: index === 0 })), note };
}
