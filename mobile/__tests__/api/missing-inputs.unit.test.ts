/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { NO_LOCATION_ANSWER, NO_TIMETABLE_ANSWER } from '@/api/mock/data/missing-inputs';
import { WAY_LOOKUP } from '@/api/mock/data/way-lookup';
import { isLookup } from '@/api/server/lookup-answers';
import { isAnswerReply } from '@/api/server/plan-answers';

// The app's check of what an answer says when an input was missing (P02-13): the offers and the note of an answer, a
// chip's mark, and a Lookup's note. Partitions: each left out (a main server before P02-13, an offer's hint before P04
// ticket 86), as the main server writes it, and of another shape. Expected values: main-server
// `assistant/dto/answer.dto.ts`, and the stored copies of its answers to "배고파" without the location permission
// (board n13) and without a Timetable (board n15).

const [ORIGIN, ...OTHER_CHIPS] = NO_LOCATION_ANSWER.chips;

describe('the check of an answer with what was missing', () => {
  it.each([
    ['without the location permission (board n13)', NO_LOCATION_ANSWER],
    ['without a Timetable (board n15)', NO_TIMETABLE_ANSWER],
    ['with none of it, as before P02-13', MEAL_ANSWER],
    [
      'with an offer and no hint, as before P04 ticket 86',
      { ...NO_LOCATION_ANSWER, offers: [{ kind: 'open', label: '위치 켜기', screen: 'location' }] },
    ],
  ])('passes the answer %s', (_, answer) => {
    expect(isAnswerReply(answer)).toBe(true);
  });

  it('passes a chip marked relaxed', () => {
    expect(isAnswerReply({ ...NO_LOCATION_ANSWER, chips: [{ ...ORIGIN, mark: 'relaxed' }] })).toBe(true);
  });

  it.each([
    ['an offer that asks in words', { offers: [{ kind: 'ask', label: '배고파', text: '배고파' }] }],
    ['an offer of an unknown screen', { offers: [{ kind: 'open', label: '열기', screen: 'settings' }] }],
    ['offers that are not a list', { offers: { kind: 'open', label: '위치 켜기', screen: 'location' } }],
    [
      'an offer whose hint is not text',
      { offers: [{ kind: 'open', label: '위치 켜기', screen: 'location', hint: 7 }] },
    ],
    ['a note that is not text', { note: ['시간표를 넣으면'] }],
    ['a note of null', { note: null }],
    ['a chip of an unknown mark', { chips: [{ ...ORIGIN, mark: 'guessed' }, ...OTHER_CHIPS] }],
  ])('fails an answer with %s', (_, changed) => {
    expect(isAnswerReply({ ...NO_LOCATION_ANSWER, ...changed })).toBe(false);
  });
});

describe("the check of a Lookup's note", () => {
  it('passes a Lookup with a note, and one without', () => {
    expect(isLookup({ ...WAY_LOOKUP, note: '캠퍼스 밖이라 친구에게 내 위치가 보이지 않아요' })).toBe(true);
    expect(isLookup(WAY_LOOKUP)).toBe(true);
  });

  it('fails a note that is not text', () => {
    expect(isLookup({ ...WAY_LOOKUP, note: 7 })).toBe(false);
  });
});
