/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { LIBRARY_ANSWER_RULES, LIBRARY_RULES, LIBRARY_STUDY_RULES } from '../src/assistant/library/library-rules.js';

// Free seats of a reading room, asked from an app that draws answers, are asked as that seat (P05 ticket 61): the book
// card is the seat ticket with its free seats. The text chat still shows the seats card.

const TEXT_CHAT_SEATS =
  'To see free seats or rooms of one space (좌석 현황), call findLibrarySpace, then showLibrarySeats.';

describe.each([
  ['LIBRARY_ANSWER_RULES', LIBRARY_ANSWER_RULES],
  ['LIBRARY_STUDY_RULES', LIBRARY_STUDY_RULES],
])('%s', (_name, rules) => {
  it('send a question about free seats of a seat space to proposeLibraryBooking, never to showLibrarySeats', () => {
    expect(rules).toContain(
      'A question about the free seats of a seat space (one whose unit is seat), such as "관정 열람실 자리 있어?" or "7층 자리 얼마나 남았어?", and a request for its 좌석 현황 are asked as a request for that seat: call findLibrarySpace, then proposeLibraryBooking as for any seat, and never showLibrarySeats.',
    );
    expect(rules).not.toContain(TEXT_CHAT_SEATS);
  });

  it('answer it in one sentence that names no card', () => {
    expect(rules).toContain('Your reply to it is one sentence in all');
    expect(rules).toContain('It never names a card and never says how many seats are free');
  });

  it('keep showLibrarySeats for the free rooms of a room space', () => {
    expect(rules).toContain(
      'To see the free rooms of a room space (좌석 현황), call findLibrarySpace, then showLibrarySeats.',
    );
  });

  it('send a seat closed for today to proposeLibraryBooking, and a room to showLibrarySeats', () => {
    expect(rules).toContain(
      'call proposeLibraryBooking for it, or showLibrarySeats for the free rooms of a room space: it answers closedToday',
    );
    expect(rules).not.toContain('call showLibrarySeats for it: it answers closedToday');
  });
});

describe('LIBRARY_RULES, the text chat', () => {
  it('still sends 좌석 현황 to showLibrarySeats, with nothing of the answer app', () => {
    expect(LIBRARY_RULES).toContain(TEXT_CHAT_SEATS);
    expect(LIBRARY_RULES).not.toContain('A question about the free seats of a seat space');
    expect(LIBRARY_RULES).not.toContain('closedToday');
  });
});
