/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { normaliseWords } from '../src/common/normalise-words.js';

describe('normaliseWords', () => {
  it.each([
    ['학관', '학관'],
    [' 학 관 ', '학관'],
    ['중앙\t도서관\n본관', '중앙도서관본관'],
    ['SK경영관', 'sk경영관'],
    ['301동', '301동'],
    ['ㅎㄱ', 'ㅎㄱ'],
  ])('reads %j as %j', (words, key) => {
    expect(normaliseWords(words)).toBe(key);
  });

  it('reads a word typed as separate jamo as its syllables', () => {
    expect(normaliseWords('학관'.normalize('NFD'))).toBe('학관');
  });

  it('removes a full-width space as any other', () => {
    expect(normaliseWords('학　관')).toBe('학관');
  });
});
