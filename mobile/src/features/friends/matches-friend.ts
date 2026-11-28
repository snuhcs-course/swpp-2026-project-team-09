/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { matchesWords } from '@/features/search/matches-words';

// What every search of Friends is named and shows in grey: the friend panel, 친구 관리 and the 파티 form's invitations.
export const FRIEND_SEARCH = '친구 검색';

// The search of Friends, by name only (the user, 2026-11-28: "학과 검색은 필요 없을 것 같아.").
export function matchesFriend({ name }: { name: string }, words: string): boolean {
  return matchesWords(words, [name]);
}
