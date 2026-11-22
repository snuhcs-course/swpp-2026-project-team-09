/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { typingWordsOf } from '@/features/assistant/typing-words';

// What stands above the keyboard on the answer (the rule of 2026-11-22, after a booking reply was cut at "예를 …"):
// a reply that asks keeps its question sentence whole, its example sentence moved to the input's placeholder; a reply
// that asks nothing keeps its first sentence. Expected values: the reply seen on the phone, and the rule.
const BOOKING = '내일 몇 시부터 몇 시까지 예약할까요? 예를 들어 14:00부터 16:00처럼 알려 주세요.';

// Partitions: a question with an example; a long reply whose question is not first; a question without an example;
// no question; a number with a point (PR 479's review); empty words.
describe('typingWordsOf', () => {
  it('keeps the question whole and moves the example to the placeholder', () => {
    expect(typingWordsOf(BOOKING)).toEqual({
      words: '내일 몇 시부터 몇 시까지 예약할까요?',
      asks: true,
      example: '예: 14:00부터 16:00',
    });
  });

  it('keeps only the question of a long reply', () => {
    const long = `관정도서관 7층 열람실은 내일 9시부터 열어요. 지금은 자리가 넉넉해요. ${BOOKING}`;

    expect(typingWordsOf(long)).toEqual({
      words: '내일 몇 시부터 몇 시까지 예약할까요?',
      asks: true,
      example: '예: 14:00부터 16:00',
    });
  });

  it('keeps the placeholder when no sentence starts with 예를 들어', () => {
    expect(typingWordsOf('어디서 먹을까요? 가까운 곳으로 골라 드릴게요.')).toEqual({
      words: '어디서 먹을까요?',
      asks: true,
      example: null,
    });
  });

  it('keeps the first sentence of a reply that asks nothing', () => {
    expect(typingWordsOf('오늘 학생회관식당 점심은 제육볶음이에요. 12시에 가장 붐벼요.')).toEqual({
      words: '오늘 학생회관식당 점심은 제육볶음이에요.',
      asks: false,
      example: null,
    });
  });

  it('does not end a sentence inside a number', () => {
    expect(typingWordsOf('도서관까지 0.8km예요. 5분 걸려요.').words).toBe('도서관까지 0.8km예요.');
    expect(typingWordsOf('1.5시간 괜찮을까요?').words).toBe('1.5시간 괜찮을까요?');
  });

  it('gives nothing for empty words', () => {
    expect(typingWordsOf('  ')).toEqual({ words: '', asks: false, example: null });
  });
});
