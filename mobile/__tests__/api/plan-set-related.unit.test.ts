/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { isAnswerReply } from '@/api/server/plan-answers';

// A meal's or a meeting's answer naming the User's Quests it touches (P05 ticket 17): the one it sets aside, and those
// related. Both optional: a main server before them sends neither. Each Quest's point on the map (P05 ticket 28) is
// optional too: a main server before it sends none.

const MEETING = {
  kind: 'meet',
  questId: '1a2b3c4d-0000-4000-8000-000000000001',
  title: 'SK경영관 앞에서 만나기',
  startAt: '2026-11-17T14:00:00+09:00',
  endAt: '2026-11-17T15:00:00+09:00',
  place: '58동',
  people: [{ name: '김민수', answer: 'waiting' }],
  mine: true,
  changeable: false,
};

const LUNCH = { ...MEETING, kind: 'meal-lunch', title: '학생회관식당에서 점심', people: [], changeable: true };

const POINT = {
  placeId: 'e3b13da4-ec15-5b6e-ba98-a0fd4346e08b',
  label: '학생회관',
  latitude: 37.45932,
  longitude: 126.95058,
};

const withTouched = (touched: object): unknown => ({ ...MEAL_ANSWER, ...touched });

describe("An answer's Quests set aside and related", () => {
  it.each([
    ['a lunch set aside and a meeting related', { planSet: LUNCH, related: [MEETING] }],
    ['none set aside and none related', { planSet: null, related: [] }],
    ['a lunch set aside at its point', { planSet: { ...LUNCH, point: POINT } }],
    ['a meeting related with no point', { related: [{ ...MEETING, point: null }] }],
  ])('is believed with %s', (_, touched) => {
    expect(isAnswerReply(withTouched(touched))).toBe(true);
  });

  it('may be without them', () => {
    expect(isAnswerReply(MEAL_ANSWER)).toBe(true);
  });

  it.each([
    ['a Quest set aside of no kind', { planSet: { ...LUNCH, kind: 'class' } }],
    ['related as one Quest, not a list', { related: MEETING }],
    ['a related Quest without its id', { related: [{ ...MEETING, questId: undefined }] }],
    ['a point without its latitude', { planSet: { ...LUNCH, point: { ...POINT, latitude: undefined } } }],
  ])('is refused with %s', (_, touched) => {
    expect(isAnswerReply(withTouched(touched))).toBe(false);
  });
});
