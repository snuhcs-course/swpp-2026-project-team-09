/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { type ExtraSnuSource } from './events-collected.dto.js';

// The question to `/collections/scheduled` before a scheduled Collection: does the schedule collect this Source now?
export interface CollectionScheduledQuestion {
  source: ExtraSnuSource;
}

// The answer: whether the main server's global setting collection.extraSnu is on.
export const collectionScheduledAnswerSchema = z.object({ scheduled: z.boolean() });
