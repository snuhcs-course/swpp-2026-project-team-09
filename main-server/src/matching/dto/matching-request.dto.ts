// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #45 #48
import { z } from 'zod';

// The size is checked by the service, so that a size outside 2 to 4 is refused with a code of its own.
export const askForMatchingSchema = z.strictObject({ globalEventId: z.uuid(), size: z.int() });

export type AskForMatchingDto = z.infer<typeof askForMatchingSchema>;

// A request as the match server answers it, and as the app gets it.
export const matchingRequestSchema = z.object({
  globalEventId: z.uuid(),
  size: z.int(),
  state: z.enum(['waiting', 'matched', 'withdrawn', 'expired']),
  arrivedAt: z.iso.datetime(),
  // The Quest of a matched request once the main server has created it.
  questId: z.uuid().nullable(),
});

export type MatchingRequestDto = z.infer<typeof matchingRequestSchema>;
