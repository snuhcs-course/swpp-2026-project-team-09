/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { z } from 'zod';

// The worker's question to `/global-events/stored-posts`: which of these posts of the events list are stored?
export const storedEventPostsSchema = z.strictObject({
  postNumbers: z.array(z.int32().positive()),
});

export type StoredEventPostsQuestion = z.infer<typeof storedEventPostsSchema>;

// The answer: the posts asked about that are stored, in any state.
export interface StoredEventPostsDto {
  postNumbers: number[];
}
