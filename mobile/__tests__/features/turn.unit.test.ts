/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ChatBubble } from '@/features/assistant/use-chat';
import { turnOf, turnsOf } from '@/features/assistant/turn';

// What a turn of the conversation is (P02 spec, "The answer frame"): the User's last message and everything after it,
// with the id of its first bubble, which keys an earlier turn (P02 ticket 32).

function said(id: number, text: string): ChatBubble {
  return { id, role: 'user', text, cards: [], mapButtons: [], proposal: null, failure: null };
}

function answered(id: number, text: string, more: Partial<ChatBubble> = {}): ChatBubble {
  return { id, role: 'assistant', text, cards: [], mapButtons: [], proposal: null, failure: null, ...more };
}

// Partitions: no bubble; the app's own bubble alone, with no message of the User; one message waiting for its reply;
// one message and its reply; two turns; a turn that ends with a failure and the app's own bubbles.
describe('a turn of the conversation', () => {
  it('is none while nothing was said', () => {
    expect(turnOf([])).toBeNull();
  });

  // With the chat sheet gone (P02-04), a card the app shows on its own, as the room-window Notification's, has only
  // the frame to stand in: its words are the pill's.
  it("is the app's own bubbles, the first one's words asked, while the User said nothing", () => {
    const own = answered(1, '예약 창이 열렸어요', { own: true });

    expect(turnOf([own])).toEqual({ id: 1, asked: '예약 창이 열렸어요', after: [own] });
  });

  it("is the User's message alone while its reply is on its way", () => {
    expect(turnOf([said(1, '배고파')])).toEqual({ id: 1, asked: '배고파', after: [] });
  });

  it("is the User's message and the Assistant's reply", () => {
    const reply = answered(2, '12:15에 302동식당에서 민수와 만나 먹어요.');

    expect(turnOf([said(1, '배고파, 민수랑 같이'), reply])).toEqual({
      id: 1,
      asked: '배고파, 민수랑 같이',
      after: [reply],
    });
  });

  it("is the User's last message and what came after it, without the turn before", () => {
    const later = answered(4, '지은이도 부를게요.');

    expect(turnOf([said(1, '배고파'), answered(2, '어디서 먹을까요?'), said(3, '지은이도 불러 줘'), later])).toEqual({
      id: 3,
      asked: '지은이도 불러 줘',
      after: [later],
    });
  });

  it("keeps a failure and the app's own bubbles after the User's message", () => {
    const failure = answered(2, '지금은 답할 수 없어요. 잠시 후 다시 시도해 주세요', { failure: 'unavailable' });
    const own = answered(3, '예약했어요.', { own: true });

    expect(turnOf([said(1, '관정 7층 예약해줘'), failure, own])).toEqual({
      id: 1,
      asked: '관정 7층 예약해줘',
      after: [failure, own],
    });
  });
});

// Partitions: no bubble; two turns; the app's own bubble before the User said anything, then a message. Expected
// values: ticket 32, "지난 답 N개" lists every turn before the one on screen, the first first.
describe('the turns of the conversation', () => {
  it('are none while nothing was said', () => {
    expect(turnsOf([])).toEqual([]);
  });

  it('are each message of the User with what came after it, the first first', () => {
    const first = answered(2, '어디서 먹을까요?');
    const second = answered(4, '지은이도 부를게요.');

    expect(turnsOf([said(1, '배고파'), first, said(3, '지은이도 불러 줘'), second])).toEqual([
      { id: 1, asked: '배고파', after: [first] },
      { id: 3, asked: '지은이도 불러 줘', after: [second] },
    ]);
  });

  it("start with the app's own bubbles when the app spoke first", () => {
    const own = answered(1, '예약 창이 열렸어요', { own: true });

    expect(turnsOf([own, said(2, '7층으로 해줘')])).toEqual([
      { id: 1, asked: '예약 창이 열렸어요', after: [own] },
      { id: 2, asked: '7층으로 해줘', after: [] },
    ]);
  });
});
