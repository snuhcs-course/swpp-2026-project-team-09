/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';

type NoPlan = NonNullable<AnswerReply['noPlan']>;

// A no-plan answer without its band (P05 ticket 65), for a test of its reason, its lines and its offers to ease.
export function withoutBand(noPlan: AnswerReply['noPlan'] | undefined): Omit<NoPlan, 'band'> | null | undefined {
  if (noPlan === null || noPlan === undefined) {
    return noPlan;
  }
  const { reason, lines, relax } = noPlan;
  return relax === undefined ? { reason, lines } : { reason, lines, relax };
}
