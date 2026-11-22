/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { isLibraryAsk, libraryReply } from '@/api/mock/library-replies';

// The mock Assistant's study-seat answers (P01 ticket 03), as the main server's rules have them: "공부할 자리" is a
// reading-room seat card, and a seat for tomorrow is asked about without a time and refused with one.

describe('the mock’s study-seat answers', () => {
  it('answers "공부할 자리" with the seat card', () => {
    expect(isLibraryAsk('공부할 자리')).toBe(true);

    const reply = libraryReply('공부할 자리');
    const [card] = reply.cards;
    expect(card?.kind).toBe('library');
    expect(card?.kind === 'library' ? card.library.action : null).toBe('book');
  });

  it('asks the time of a seat for tomorrow, with no card', () => {
    const reply = libraryReply('내일 공부할 자리');

    expect(reply.text).toBe('몇 시부터 몇 시까지 예약할까요?');
    expect(reply.cards).toEqual([]);
  });

  it('refuses a seat for tomorrow with a time: seats are booked for today only', () => {
    expect(libraryReply('내일 14시에 공부할 자리').text).toBe('열람실은 당일만 예약할 수 있어요.');
  });

  it('leaves tomorrow’s study rooms to their own card', () => {
    expect(libraryReply('내일 스터디룸 예약해줘').cards).toHaveLength(1);
  });
});
