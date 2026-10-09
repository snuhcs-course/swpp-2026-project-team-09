// AI-generated with Claude Opus 5.5, 2026-10-02 to 2026-10-04, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #26 #31
import { z } from 'zod';
import { Source } from '../../generated/prisma/client.js';

// Posted by the worker to `/collections/failed` when a Collection could not fetch or read its Source.
export const collectionFailedSchema = z.strictObject({
  source: z.enum(Source),
  failedAt: z.iso.datetime({ offset: true }),
  reason: z.string().min(1),
});

export type CollectionFailedMessage = z.infer<typeof collectionFailedSchema>;
