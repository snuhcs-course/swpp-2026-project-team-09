import { z } from 'zod';
import { Source } from '../../generated/prisma/client.js';

// Sent by the worker as `collection-failed` when a Collection could not fetch or read its Source.
export const collectionFailedSchema = z.strictObject({
  source: z.enum(Source),
  failedAt: z.iso.datetime({ offset: true }),
  reason: z.string().min(1),
});

export type CollectionFailedMessage = z.infer<typeof collectionFailedSchema>;
