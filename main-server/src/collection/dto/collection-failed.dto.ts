import { z } from 'zod';
import { CollectionSource } from '../../generated/prisma/client.js';

// Sent by the worker as `collection-failed` when a run of a source could not collect it.
export const collectionFailedSchema = z.strictObject({
  source: z.enum(CollectionSource),
  failedAt: z.iso.datetime({ offset: true }),
  // What went wrong, such as a page that did not answer or a layout the parser did not expect.
  reason: z.string().min(1),
});

export type CollectionFailedMessage = z.infer<typeof collectionFailedSchema>;
