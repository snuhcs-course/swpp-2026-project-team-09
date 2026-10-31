/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { type PostSource } from './events-collected.dto.js';

// The question to `/global-events/stored-posts`: which of these posts of this Source does the main server store?
export interface StoredEventPostsQuestion {
  source: PostSource;
  keys: string[];
}

// The answer: those it stores, in any state.
export const storedEventPostsAnswerSchema = z.object({ keys: z.array(z.string()) });
