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

// What the invitation says became of the Plan on screen; null while nothing did.
function outcomeOf(
  what: string,
  { made, changed, left }: Pick<PlanInvitation, 'made' | 'changed' | 'left'>,
): PlanOutcome | null {
  if (changed !== null) {
    return { kind: 'changed', what };
  }
  if (left !== null) {
    return { kind: 'kept', what };
  }
  if (made === null) {
    return null;
  }
  return made.alone === undefined ? { kind: 'sent', what, invited: made.invitations.length } : { kind: 'alone', what };
}

// What became of each reply's Plan, by the reply's bubble id, for the list of questions (P04 ticket 10): the Quest made
// from the Plan on screen, a Quest already set changed to it (바꾸기), or that Quest left as it is (그대로 두기) is kept
// with the reply whose answer is on screen, a recalculation's included, once the invitation says so. It is kept while
// the app runs, as the conversations are.
export function usePlanOutcomes(
  bubbles: readonly ChatBubble[],
  shown: ShownAnswer,
  invitation: PlanInvitation,
): PlanOutcomes {
  const [outcomes, setOutcomes] = useState<PlanOutcomes>(new Map());
  const { made, changed, left } = invitation;
  const { source, plan } = shown;
  const replyId = source === null ? null : (bubbles.find(({ answer }) => answer === source)?.id ?? null);
  useEffect(() => {
    const outcome = plan === null ? null : outcomeOf(planWhat(plan), { made, changed, left });
    if (outcome === null || replyId === null) {
      return;
    }
    setOutcomes((last) => new Map(last).set(replyId, outcome));
  }, [made, changed, left, plan, replyId]);
  return outcomes;
}
