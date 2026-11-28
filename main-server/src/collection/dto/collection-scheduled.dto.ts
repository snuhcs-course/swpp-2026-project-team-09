/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { Source } from '../../generated/prisma/client.js';

// Asked by the worker at `/collections/scheduled` before a scheduled Collection of a Source that has a switch.
export const collectionScheduledSchema = z.strictObject({
  source: z.enum(Source),
});

export type CollectionScheduledQuestion = z.infer<typeof collectionScheduledSchema>;

export interface CollectionScheduledAnswer {
  scheduled: boolean;
}
