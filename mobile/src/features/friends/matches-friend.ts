/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { matchesWords } from '@/features/search/matches-words';

// The search of Friends by name and by department, in the friend panel, 친구 관리 and the 파티 form's invitations.
export function matchesFriend({ name, department }: { name: string; department: string }, words: string): boolean {
  return matchesWords(words, [name, department]);
}
