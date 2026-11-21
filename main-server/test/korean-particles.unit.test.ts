/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { withCopula, withTopic } from '../src/assistant/gathering/answer-words.js';

// A particle follows the sound of the word's last syllable, a digit included: in the usage test of 2026-11-21 the
// answer said "자연과학관6(24동)는", where 6 is read 육.

describe('A particle after a word', () => {
  it.each([
    ['자연과학관6', '자연과학관6은'],
    ['공학관1', '공학관1은'],
    ['인문관2', '인문관2는'],
    ['약학관3', '약학관3은'],
    ['학생회관', '학생회관은'],
    ['301동식당', '301동식당은'],
    ['아워홈', '아워홈은'],
    ['두레미담', '두레미담은'],
    ['자하연', '자하연은'],
    ['3식당', '3식당은'],
    ['교수회관', '교수회관은'],
    ['카페', '카페는'],
  ])('takes the topic particle after %s', (word, expected) => {
    expect(withTopic(word)).toBe(expected);
  });

  it('takes the copula after a digit by its sound', () => {
    expect(withCopula('7')).toBe('7이에요');
    expect(withCopula('9')).toBe('9예요');
  });
});
