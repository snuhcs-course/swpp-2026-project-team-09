/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type Card, type CardKind, CARDS_MAX, type Presented } from '../feature.js';

export function idOf(card: Card): string {
  return card.kind === 'quest' ? card.quest.id : card.globalEvent.id;
}

// The ids of a presenter's call that the reply does not show yet, each once, in the order given. Throws when the reply
// would then show more than CARDS_MAX cards, whatever their kinds, so that nothing of the call is shown.
export function freshIds(presented: Presented, kind: CardKind, ids: readonly string[]): string[] {
  const shown = new Set(presented.cards.filter((card) => card.kind === kind).map((card) => idOf(card)));
  const fresh = [...new Set(ids)].filter((id) => !shown.has(id));
  if (presented.cards.length + fresh.length > CARDS_MAX) {
    throw new Error(`A reply shows at most ${CARDS_MAX} cards, and nothing was shown.`);
  }
  return fresh;
}
