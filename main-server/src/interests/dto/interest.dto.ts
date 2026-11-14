/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';

export const WORDS_MAX = 60;

export const watchSchema = z.strictObject({
  words: z.string().trim().min(1).max(WORDS_MAX),
});

export type WatchDto = z.infer<typeof watchSchema>;

// `createdAt` in ISO 8601.
export interface InterestDto {
  id: string;
  words: string;
  topics: string[];
  createdAt: string;
}

// `watched`: a watched interest matched, not only a hashtag.
export interface MatchDto {
  id: string;
  watched: boolean;
}

export interface MatchesDto {
  globalEvents: MatchDto[];
  quests: MatchDto[];
}
