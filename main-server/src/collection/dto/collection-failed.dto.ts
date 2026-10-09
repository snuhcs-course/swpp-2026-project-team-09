/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { Source } from '../../generated/prisma/client.js';

// Posted by the worker to `/collections/failed` when a Collection could not fetch or read its Source.
export const collectionFailedSchema = z.strictObject({
  source: z.enum(Source),
  failedAt: z.iso.datetime({ offset: true }),
  reason: z.string().min(1),
});

export type CollectionFailedMessage = z.infer<typeof collectionFailedSchema>;
