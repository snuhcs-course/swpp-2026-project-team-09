/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useRef } from 'react';
import type { AnswerReply } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import type { ShownAnswer } from './use-shown-answer';

// A reply's answer asked without the location permission, which offers to turn it on, is asked again once from where
// the User is when a position on campus comes: the permission given from its hint line or any other way (P04 ticket
// 86). The recalculation calls no model.
export function useAskedAgain({ source, answer, again }: ShownAnswer, position: LatLng | null): void {
  const asked = useRef<AnswerReply | null>(null);
  const lacks = answer !== null && (answer.offers ?? []).some(({ screen }) => screen === 'location');
  useEffect(() => {
    if (lacks && position !== null && source !== null && asked.current !== source) {
      asked.current = source;
      again();
    }
  });
}
