/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { isLibraryAsk, libraryReply } from '@/api/mock/library-replies';

// The mock Assistant's study-seat answers (P01 ticket 03), as the main server's rules have them (P05 ticket 34): a
// reading room named is a seat card, and a seat for tomorrow is refused at once. "공부할 자리" without a booking is the
// study answer since the app says `study-plan` (P10 ticket 23, `mock-study-plan.unit`).

describe('the mock’s study-seat answers', () => {
  it('answers a reading room with the seat card', () => {
    expect(isLibraryAsk('열람실 자리')).toBe(true);

    const reply = libraryReply('열람실 자리');
    const [card] = reply.cards;
    expect(card?.kind).toBe('library');
    expect(card?.kind === 'library' ? card.library.action : null).toBe('book');
  });

  it('refuses a seat for tomorrow at once, with a time or without: seats are booked for today only', () => {
    const today =
      '관정도서관 열람실은 당일만 예약할 수 있어서 지금은 예약할 수 없어요. 내일 07:00에 열람실이 열면 다시 말해 주세요.';
    for (const words of ['내일 열람실 자리', '내일 14시에 열람실 자리']) {
      const reply = libraryReply(words);
      expect(reply.text).toBe(today);
      expect(reply.cards).toEqual([]);
    }
  });

  it('leaves tomorrow’s study rooms to their own card', () => {
    expect(libraryReply('내일 스터디룸 예약해줘').cards).toHaveLength(1);
  });
});
