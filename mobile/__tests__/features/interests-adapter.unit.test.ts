/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// Partitions: a watched interest whose topics are its words, one read as other topics, one read as both, words that
// differ from their topic only in spaces or case, and the profile's hashtags with and without any. Expected values:
// P05 ticket 08 (the interests screen) and main-server's README, Interests (how topics compare).

import type { WatchedInterest } from '@/api/interest-types';
import { hashtagChips, interestRow } from '@/features/interests/adapter';

function interest(words: string, topics: string[]): WatchedInterest {
  return { id: 'i1', words, topics, createdAt: '2026-11-15T03:12:00.000Z' };
}

describe('interestRow', () => {
  it('shows the words alone when the only topic is the words', () => {
    expect(interestRow(interest('채용', ['채용']))).toEqual({ id: 'i1', title: '채용', topics: null });
  });

  it('leaves out a topic that is the words without their spaces and case', () => {
    expect(interestRow(interest('AI 커리어', ['ai커리어'])).topics).toBeNull();
  });

  it('names the topics the words were read as', () => {
    expect(interestRow(interest('채용 관련 행사', ['채용'])).topics).toBe('채용');
  });

  it('names each topic other than the words, in their order', () => {
    expect(interestRow(interest('배드민턴', ['배드민턴', '운동'])).topics).toBe('운동');
    expect(interestRow(interest('배드민턴 칠 사람', ['배드민턴', '운동'])).topics).toBe('배드민턴 · 운동');
  });
});

describe('hashtagChips', () => {
  it('writes each hashtag with its #', () => {
    expect(hashtagChips(['러닝', '재즈'])).toEqual(['#러닝', '#재즈']);
  });

  it('gives none for a profile without hashtags', () => {
    expect(hashtagChips([])).toEqual([]);
  });
});
