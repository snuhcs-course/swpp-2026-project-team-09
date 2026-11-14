/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { WatchedInterest } from '@/api/interest-types';

// One row of 관심사's watched interests: the words as the User said them, and the topics they were read as, null where
// the only topic is the words themselves.
export interface InterestRow {
  id: string;
  title: string;
  topics: string | null;
}

// As the main server compares topics: lowercased, without spaces and without a leading '#'.
function normalised(words: string): string {
  return words.replaceAll(/\s/gu, '').replace(/^#+/u, '').toLowerCase();
}

export function interestRow({ id, words, topics }: WatchedInterest): InterestRow {
  const read = topics.filter((topic) => topic !== normalised(words));
  return { id, title: words, topics: read.length === 0 ? null : read.join(' · ') };
}

// The profile keeps its hashtags without the '#', which they are shown with.
export function hashtagChips(hashtags: readonly string[]): string[] {
  return hashtags.map((hashtag) => `#${hashtag}`);
}
