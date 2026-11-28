/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { FRIEND_SEARCH, matchesFriend } from '@/features/friends/matches-friend';

// Every list of Friends searches by name only (the user, 2026-11-28: "학과 검색은 필요 없을 것 같아.").
const MIN_JUN = { name: '김민준', department: '컴퓨터공학부' };

describe('matchesFriend', () => {
  it.each(['김민준', '민준', '김미', 'ㄱㅁㅈ'])('finds 김민준 by %s', (words) => {
    expect(matchesFriend(MIN_JUN, words)).toBe(true);
  });

  it.each(['컴퓨터', '공학부', 'ㅋㅍㅌ'])('does not find him by his department, %s', (words) => {
    expect(matchesFriend(MIN_JUN, words)).toBe(false);
  });

  it('names its search the same on every list', () => {
    expect(FRIEND_SEARCH).toBe('친구 검색');
  });
});
