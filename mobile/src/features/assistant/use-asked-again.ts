/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useRef } from 'react';
import type { AnswerReply } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import type { PlanInvitation } from './use-plan-invitation';
import type { ShownAnswer } from './use-shown-answer';

// What the User did with the answer on screen, which a recalculation would drop: a Quest made of it, or 바꾸기 or
// 그대로 두기 of the Quest beside it, and a request of those on its way.
export type Settling = Pick<PlanInvitation, 'made' | 'changed' | 'left' | 'sending' | 'changing'>;

// A reply's answer asked without the location permission, which offers to turn it on, is asked again once from where
// the User is when a position on campus comes: the permission given from its hint line or any other way (P04 ticket
// 86). The recalculation calls no model. An answer the User has acted on is never asked again, since its new answer
// would drop what was made or changed (review of PR 597), and one waits while a request is on its way.
export function useAskedAgain(shown: ShownAnswer, position: LatLng | null, settling: Settling): void {
  const asked = useRef<AnswerReply | null>(null);
  const { source, answer, again, recalculating } = shown;
  const { made, changed, left, sending, changing } = settling;
  const lacks = answer !== null && (answer.offers ?? []).some(({ screen }) => screen === 'location');
  const settled = made !== null || changed !== null || left !== null;
  const busy = sending || changing || recalculating;
  useEffect(() => {
    if (!lacks || position === null || source === null || asked.current === source) {
      return;
    }
    if (settled) {
      asked.current = source;
    } else if (!busy) {
      asked.current = source;
      again();
    }
  });
}
