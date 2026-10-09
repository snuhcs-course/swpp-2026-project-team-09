/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { MatchingRequestState, Prisma } from '../../generated/prisma/client.js';

// What the main server passes on once it has taken a User's request.
export const askSchema = z.strictObject({
  globalEventId: z.uuid(),
  size: z.int().min(2).max(4),
  hashtags: z.array(z.string()),
});

export type AskDto = z.infer<typeof askSchema>;

export interface MatchingRequestDto {
  globalEventId: string;
  size: number;
  state: MatchingRequestState;
  arrivedAt: string;
  questId: string | null;
}

// Read with its match, which names the Quest once the main server has created it, unless the request was placed.
export const MATCHING_REQUEST_INCLUDE = { match: { select: { questId: true } } } as const;

export type MatchingRequestWithMatch = Prisma.MatchingRequestGetPayload<{ include: typeof MATCHING_REQUEST_INCLUDE }>;

export function toMatchingRequestDto({
  globalEventId,
  size,
  state,
  arrivedAt,
  questId,
  match,
}: MatchingRequestWithMatch): MatchingRequestDto {
  return {
    globalEventId,
    size,
    state,
    arrivedAt: arrivedAt.toISOString(),
    // A placed request names its Quest itself. A User left out of the match's Quest has an expired request.
    questId: state === 'matched' ? (questId ?? match?.questId ?? null) : null,
  };
}
