/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { friendsNamed } from '../src/assistant/tools/resolve-friend.js';

// Which of the User's Friends resolveFriend answers for the User's words: those whose name holds them and whose
// department holds the department's words, or only those named exactly the words while no other one's given name is
// them. Friends chosen by hand.

const friend = (name: string, department = '컴퓨터공학부'): { name: string; department: string } => ({
  name,
  department,
});

const kimCs = friend('김민수', '컴퓨터공학부');
const leeBiz = friend('이민수', '경영학과');

describe('The Friends resolveFriend answers', () => {
  it('are every Friend whose name holds the words, ignoring spaces and case', () => {
    expect(friendsNamed([kimCs, leeBiz, friend('지은')], '민 수')).toEqual([kimCs, leeBiz]);
    expect(friendsNamed([friend('Alex Kim'), friend('김민수')], 'alexkim')).toEqual([friend('Alex Kim')]);
  });

  it('are those whose department holds the department words too, ignoring spaces (민수 of 경영)', () => {
    expect(friendsNamed([kimCs, leeBiz], '민수', '경영')).toEqual([leeBiz]);
    expect(friendsNamed([kimCs, leeBiz], '민수', '컴퓨터 공학')).toEqual([kimCs]);
  });

  it('are none when no department holds the department words', () => {
    expect(friendsNamed([kimCs, leeBiz], '민수', '물리')).toEqual([]);
  });

  it('are the one named exactly the words, though another name holds them (김민수, not 김민수진)', () => {
    expect(friendsNamed([kimCs, friend('김민수진')], '김민수')).toEqual([kimCs]);
  });

  it('are every one named exactly the words when two are', () => {
    const kimBiz = friend('김민수', '경영학과');

    expect(friendsNamed([kimCs, kimBiz, friend('김민수진')], '김민수')).toEqual([kimCs, kimBiz]);
  });

  it('are all that matched when another one’s given name is the words (민수 beside 김민수)', () => {
    const minsu = friend('민수');

    expect(friendsNamed([minsu, kimCs], '민수')).toEqual([minsu, kimCs]);
  });

  it('take the given name as the full name less its first character (민수 beside 남궁민수)', () => {
    const minsu = friend('민수');

    expect(friendsNamed([minsu, friend('남궁민수')], '민수')).toEqual([minsu]);
  });
});
