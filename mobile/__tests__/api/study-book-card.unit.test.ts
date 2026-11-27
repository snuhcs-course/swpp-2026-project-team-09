/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { STUDY_PLAN_ANSWER } from '@/api/mock/data/study-plan-answer';
import { isLibraryCardData } from '@/api/server/library-card-answers';
import { isStudyOrAbsent } from '@/api/server/study-plan-answers';
import BOOK from '../fixtures/study-kwanjeong-book.json';

// 관정관's study part carries the book card the app opens in it (the main server's P10 ticket 21, the app's 22): the
// main server's fixture, `study-kwanjeong-book.json`, is read as the app reads a study Plan.

const KEY = 'book:7F-7A-zone2:2026-11-04:1930:210';

// Partitions: the fixture as sent; its book without its card. Expected values: the fixture.
describe("관정관's study part", () => {
  it('is read with its book card, which is a library card the app can open', () => {
    expect(isStudyOrAbsent(BOOK)).toBe(true);
    expect(isLibraryCardData(BOOK.book.card)).toBe(true);
    expect(BOOK.book.card.key).toBe(KEY);
  });

  it('is refused with a book without its card', () => {
    expect(isStudyOrAbsent({ ...BOOK, book: { spaceId: BOOK.book.spaceId } })).toBe(false);
  });

  it('is the fixture in the mock’s study answer', () => {
    const kwanjeong = STUDY_PLAN_ANSWER.plans.find(({ id }) => id === '관정관');

    expect(kwanjeong?.study?.book?.card.key).toBe(KEY);
  });
});
