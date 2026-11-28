/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { cardToShow, countOf, type FirstRunCard, type FirstRunFacts } from '@/features/first-run/rules';

// The tour of the bottom tabs (P06 ticket 07): one step for each of the bar's five slots, in its order (A04 ticket
// 09): 파티, 행사, the map and the AI in the middle, 알림 and 내 정보.
export const TOUR_STEPS = 5;

// Whether the first run (P05 ticket 09) is done with the User, so that the tour can follow it: no card waits, or
// every waiting card's question is known and none of them asks. While a fact is still coming, it is not done, so that
// the tour never covers a card about to be shown.
export function firstRunDone(waiting: readonly FirstRunCard[] | null, facts: FirstRunFacts): boolean {
  if (waiting === null || waiting.length === 0) {
    return true;
  }
  return waiting.every((card) => countOf(card, facts) !== undefined) && cardToShow(waiting, facts) === null;
}
