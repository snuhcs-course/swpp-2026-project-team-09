/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by TaeHyun79
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { POST_SOURCE_NAMES } from '../post-sources.js';

// The worker's question to `/global-events/stored-posts`: which of these posts of this Source are stored?
export const storedEventPostsSchema = z.strictObject({
  source: z.enum(POST_SOURCE_NAMES),
  keys: z.array(z.string().min(1)),
});

export type StoredEventPostsQuestion = z.infer<typeof storedEventPostsSchema>;

// The answer: the posts asked about that are stored, whatever became of their events.
export interface StoredEventPostsDto {
  keys: string[];
}
