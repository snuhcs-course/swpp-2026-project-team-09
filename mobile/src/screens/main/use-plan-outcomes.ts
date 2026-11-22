/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useState } from 'react';
import type { PlanInvitation } from '@/features/assistant/use-plan-invitation';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { type PlanOutcome, type PlanOutcomes, planWhat } from '@/features/assistant/turn-outcome';
import type { ChatBubble } from '@/features/assistant/use-chat';

// What became of each reply's Plan, by the reply's bubble id, for the list of questions (P04 ticket 10): the Quest made
// from the Plan on screen is kept with the reply whose answer is on screen, a recalculation's included, once the
// invitation says it was made. It is kept while the app runs, as the conversations are.
export function usePlanOutcomes(
  bubbles: readonly ChatBubble[],
  shown: ShownAnswer,
  invitation: PlanInvitation,
): PlanOutcomes {
  const [outcomes, setOutcomes] = useState<PlanOutcomes>(new Map());
  const { made } = invitation;
  const { source, plan } = shown;
  const replyId = source === null ? null : (bubbles.find(({ answer }) => answer === source)?.id ?? null);
  useEffect(() => {
    if (made === null || plan === null || replyId === null) {
      return;
    }
    const what = planWhat(plan);
    const outcome: PlanOutcome =
      made.alone === undefined ? { kind: 'sent', what, invited: made.invitations.length } : { kind: 'alone', what };
    setOutcomes((last) => new Map(last).set(replyId, outcome));
  }, [made, plan, replyId]);
  return outcomes;
}
