/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { matchesWords } from '@/features/search/matches-words';

const DEPARTMENT = ['컴퓨터공학부'];

describe('matchesWords on what it finds', () => {
  it.each([
    ['ㅋ', 'a first consonant alone'],
    ['ㅋㅍㅌ', 'the first consonants'],
    ['커', 'a syllable still being composed'],
    ['컴', 'a whole syllable'],
    ['컴ㅍ', 'a whole syllable and the next one begun'],
    ['컴퓨', 'whole syllables'],
    ['퓨터', 'syllables from the middle'],
    ['공학', 'the end'],
    ['컴퓨터 공학', 'with a space the text has not'],
  ])('finds 컴퓨터공학부 by %s, %s', (words) => {
    expect(matchesWords(words, DEPARTMENT)).toBe(true);
  });

  it.each([
    ['가바', '가방', 'the last consonant moved to a new syllable'],
    ['고', '과자', 'a compound vowel half typed'],
    ['달', '닭', 'a compound final half typed'],
    ['ㄱㅎ', '공학', 'initials across syllables'],
    ['ㄲ', '꿈', 'a double consonant'],
    ['KIM', 'kim', 'Latin in another case'],
    ['#스터디', '스터디 모집', "a '#' left out"],
  ])('%s finds %s: %s', (words, text) => {
    expect(matchesWords(words, [text])).toBe(true);
  });
});

describe('matchesWords on what it does not find, and on its texts', () => {
  it.each([
    ['커', '카메라'],
    ['ㅋㅌ', '컴퓨터'],
    ['컵', '컴퓨터'],
    ['간다', '가나다'],
    ['ㅁ', '김'],
  ])('%s does not find %s', (words, text) => {
    expect(matchesWords(words, [text])).toBe(false);
  });

  it('matches every text for no words or only spaces', () => {
    expect(matchesWords('', ['아무거나'])).toBe(true);
    expect(matchesWords('  ', ['아무거나'])).toBe(true);
  });

  it('looks in each text, so either the name or the department is found', () => {
    expect(matchesWords('김하', ['김하늘', '컴퓨터공학부'])).toBe(true);
    expect(matchesWords('컴', ['김하늘', '컴퓨터공학부'])).toBe(true);
    expect(matchesWords('산업', ['김하늘', '컴퓨터공학부'])).toBe(false);
  });

  it('reads Hangul that came as separate jamo (NFD) as whole syllables', () => {
    expect(matchesWords('컴', ['컴퓨터'.normalize('NFD')])).toBe(true);
  });
});
