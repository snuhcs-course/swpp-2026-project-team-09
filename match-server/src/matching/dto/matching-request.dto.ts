import { z } from 'zod';
import { MatchingRequest, MatchingRequestState } from '../../generated/prisma/client.js';

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
}

export function toMatchingRequestDto({ globalEventId, size, state, arrivedAt }: MatchingRequest): MatchingRequestDto {
  return { globalEventId, size, state, arrivedAt: arrivedAt.toISOString() };
}
