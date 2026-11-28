/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { matchesPlace } from '@/features/places/use-place-search';

const ENGINEERING_1 = { id: 'p301', number: '301', name: '제1공학관', latitude: 37.45016, longitude: 126.95259 };
const JAHAYEON = { id: 'jh', number: null, name: '자하연', latitude: 37.4598, longitude: 126.9516 };

describe('matchesPlace', () => {
  it.each([
    ['공학', 'whole syllables of the name'],
    ['고', 'a syllable still being typed'],
    ['ㄱㅎㄱ', 'first consonants'],
    ['301', 'the number'],
    ['301동', 'the number as a User writes it'],
    [' 301동 ', 'the number with spaces around it'],
  ])('finds 제1공학관 by %s, %s', (words) => {
    expect(matchesPlace(ENGINEERING_1, words)).toBe(true);
  });

  it.each(['302', '30', '인문', 'ㅇㅁ'])('does not find 제1공학관 by %s', (words) => {
    expect(matchesPlace(ENGINEERING_1, words)).toBe(false);
  });

  it('finds a spot with no number by its name only', () => {
    expect(matchesPlace(JAHAYEON, '자하')).toBe(true);
    expect(matchesPlace(JAHAYEON, '동')).toBe(false);
  });
});
