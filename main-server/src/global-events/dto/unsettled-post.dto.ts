/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type Source } from '../../generated/prisma/client.js';

// A post the step failed on or has not finished with, or whose Judgement could not be made, as an Administrator reads
// it, so that a failure shows beyond the logs: the Collection is recorded as a success whatever the step does.
export interface UnsettledPostDto {
  source: Source;
  key: string;
  address: string;
  stepFinished: boolean;
  // Why the step last failed on it: the error's name.
  stepFailure: string | null;
  stepFailedAt: string | null;
  judgementFailure: string | null;
  judgementAttempts: number;
  // Its events that are still Drafts.
  drafts: { id: string; title: string }[];
}
