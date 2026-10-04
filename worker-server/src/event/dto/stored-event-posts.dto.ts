import { z } from 'zod';

// The question to `/global-events/stored-posts`: which of these posts of the events list does the main server store?
export interface StoredEventPostsQuestion {
  postNumbers: number[];
}

// The answer: those it stores, in any state.
export const storedEventPostsAnswerSchema = z.object({ postNumbers: z.array(z.number()) });
