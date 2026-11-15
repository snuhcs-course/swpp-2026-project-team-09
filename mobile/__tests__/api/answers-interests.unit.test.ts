/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// Partitions: the documented shape of a watched interest, without topics, each checked field left out, null and of
// another type, and a list with one wrong item; the matches, empty and with a wrong item. Expected values:
// main-server's README, Interests.

import { inList, type Variant, wrongFields } from '../support/answer-variants';
import { listOf } from '@/api/server/answers';
import { isInterestMatches, isWatchedInterest } from '@/api/server/interest-client';

const INTEREST = {
  id: '0b9f7c5e-2a4d-4e8b-9c1a-3f6e5d7a8b90',
  words: '채용 관련 행사',
  topics: ['채용'],
  createdAt: '2026-11-15T03:12:00.000Z',
};

const WRONG: Variant[] = wrongFields(INTEREST, { id: [1], words: [1], topics: ['채용', [1]], createdAt: [1] });

describe('isWatchedInterest', () => {
  it.each<Variant>([
    ['the interest', INTEREST],
    ['no topics read', { ...INTEREST, topics: [] }],
  ])('%s → accepted', (_, answer) => {
    expect(isWatchedInterest(answer)).toBe(true);
  });

  it.each(WRONG)('%s → refused', (_, answer) => {
    expect(isWatchedInterest(answer)).toBe(false);
  });
});

describe('a list of watched interests', () => {
  const isInterests = listOf(isWatchedInterest);

  it('takes the empty list and a list of interests', () => {
    expect(isInterests([])).toBe(true);
    expect(isInterests([INTEREST, { ...INTEREST, id: 'i2' }])).toBe(true);
  });

  it.each(inList(INTEREST, WRONG))('refuses %s', (_, answer) => {
    expect(isInterests(answer)).toBe(false);
  });
});

describe('isInterestMatches', () => {
  const MATCH = { id: INTEREST.id, watched: true };

  it.each<Variant>([
    ['the matches', { globalEvents: [MATCH], quests: [{ ...MATCH, watched: false }] }],
    ['no match', { globalEvents: [], quests: [] }],
  ])('%s → accepted', (_, answer) => {
    expect(isInterestMatches(answer)).toBe(true);
  });

  it.each<Variant>([
    ['no quests', { globalEvents: [MATCH] }],
    ['a match without watched', { globalEvents: [{ id: MATCH.id }], quests: [] }],
    ['a watched that is no boolean', { globalEvents: [], quests: [{ id: MATCH.id, watched: 'yes' }] }],
    ['an id that is no text', { globalEvents: [{ id: 1, watched: true }], quests: [] }],
  ])('%s → refused', (_, answer) => {
    expect(isInterestMatches(answer)).toBe(false);
  });
});
