/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { LIBRARY_ANSWER_RULES, LIBRARY_RULES, LIBRARY_STUDY_RULES } from '../src/assistant/library/library-rules.js';

// The text chat's 관정도서관 rules, character for character; the fixture is that text. It changes only with the rules
// every app shares.
const TEXT_CHAT_RULES = readFileSync(new URL('fixtures/library/text-chat-rules.txt', import.meta.url), 'utf8');

const EVERY_APP = { text: LIBRARY_RULES, answer: LIBRARY_ANSWER_RULES, study: LIBRARY_STUDY_RULES };

describe('The 관정도서관 rules', () => {
  it('of the text chat are those of today, character for character', () => {
    expect(LIBRARY_RULES).toBe(TEXT_CHAT_RULES);
  });

  // On the user's phone (2026-11-27), "반납 잘 됐니?" was refused, and "반납해줘" for a seat not yet in use was answered
  // with a return card that found no seat, named in the reply (P05 ticket 59).
  it.each(Object.entries(EVERY_APP))(
    'of the %s app show the bookings for "반납 됐어?", and cancel a seat not in use',
    (_app, rules) => {
      expect(rules).not.toContain('answered by saying that you cannot see the User');
      expect(rules).toContain(
        '("예약 됐어?", "취소 됐어?", "반납 됐어?", "반납했어?"), call showMyLibraryBookings, and say in one sentence, naming no card, that each booking\'s state is shown below',
      );
      expect(rules).toContain('never say whether it went through');
      expect(rules).toContain('반납 is only for a seat confirmed at the 좌석배정기');
      expect(rules).toContain('When proposeLibraryReturn answers notInUse');
      expect(rules).toContain('say in one sentence, naming no card, that nothing is booked until');
    },
  );

  it('of an app that draws answers fill the first of several seat spaces and still ask among rooms', () => {
    expect(LIBRARY_ANSWER_RULES).not.toContain('When the words fit several bookable spaces, ask which one');
    expect(LIBRARY_ANSWER_RULES).toContain('When the words fit several bookable seat spaces');
    expect(LIBRARY_ANSWER_RULES).toContain('When the words fit several bookable rooms, ask which one');
  });

  // In the usage test of 2026-11-21 the words said "예약하기를 눌러야" while a signed-out card showed only 로그인.
  it('of an app that draws answers say to sign in first when the card shows 로그인, and name the library one way', () => {
    expect(LIBRARY_ANSWER_RULES).toContain('they sign in first when the card shows 로그인');
    expect(LIBRARY_ANSWER_RULES).toContain('Call the library 관정도서관 in replies, not 관정관.');
  });

  // "내일 공부할 자리" asked "몇 시부터 몇 시까지 예약할까요?" and refused the answer: seats are booked on their day only.
  it('of an app that draws answers ask nothing of a seat for a later day, and say it is booked on its day', () => {
    expect(LIBRARY_ANSWER_RULES).not.toContain('or a seat for another day, when the User gave no time, ask for it');
    expect(LIBRARY_ANSWER_RULES).toContain('A seat for a day after today');
    expect(LIBRARY_ANSWER_RULES).toContain('When proposeLibraryBooking answers sameDayOnly');
  });
});
