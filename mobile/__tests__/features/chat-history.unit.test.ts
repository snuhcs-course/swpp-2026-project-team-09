/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, ReplyStep } from '@/api/assistant-types';
import { DAY_LOOKUP } from '@/api/mock/data/day-lookup';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { type ChatBubble, messagesToSend } from '@/features/assistant/use-chat';
import { said } from '../support/shown-answer';

// What the conversation sends back is what the User saw (P05 ticket 03). The card draws an answer's lines in place of
// the model's text, so a reply that drew one is sent as its lines: in the usage test the model read back its own
// hidden text and took it back ("근거가 없어요") although the User had never seen it.

const HIDDEN = '앞서 301동식당이 11:00에 연다고 했어요.';

function reply(id: number, text: string, more: Partial<ChatBubble> = {}): ChatBubble {
  return { id, role: 'assistant', text, cards: [], mapButtons: [], proposal: null, failure: null, ...more };
}

function linesOf(answer: AnswerReply): string {
  return (answer.plans[0]?.lines ?? []).map((parts) => parts.map(({ text }) => text).join('')).join('\n');
}

function step(title: string, more: Partial<ReplyStep> = {}): ReplyStep {
  return {
    kind: 'seat',
    title,
    place: null,
    from: null,
    startAt: null,
    endAt: null,
    status: 'shown',
    reason: null,
    shows: null,
    ...more,
  };
}

describe('The conversation sent back', () => {
  it("sends a reply that drew an answer as the answer's lines, not the model's hidden text", () => {
    const sent = messagesToSend([said(1, '배고파'), reply(2, HIDDEN, { answer: MEAL_ANSWER })]);

    expect(sent[1]).toEqual({ role: 'assistant', text: linesOf(MEAL_ANSWER), cards: [] });
    expect(sent[1]?.text).not.toContain(HIDDEN);
  });

  it('puts the steps the card listed before the lines, with the reason of one not done', () => {
    const steps = [
      step('7층 7A 열람실 2 구역', { status: 'not-done', reason: '열람실은 당일만 예약할 수 있어요' }),
      step('학생회관식당에서 저녁', { kind: 'meal' }),
    ];

    const sent = messagesToSend([said(1, '관정 갔다가 저녁'), reply(2, HIDDEN, { answer: MEAL_ANSWER, steps })]);

    expect(sent[1]?.text).toBe(
      `1. 7층 7A 열람실 2 구역 · 열람실은 당일만 예약할 수 있어요\n2. 학생회관식당에서 저녁\n${linesOf(MEAL_ANSWER)}`,
    );
  });

  it('sends a reply in words alone with its text', () => {
    const sent = messagesToSend([said(1, '고마워'), reply(2, '천만에요.')]);

    expect(sent[1]).toEqual({ role: 'assistant', text: '천만에요.', cards: [] });
  });
});

// P04 ticket 18: the screen shows the model's words beside a Lookup (the dock's line, over the raised card, in the
// earlier answers), so they are what the reply said, and the model reads them back before the Lookup's lines: "…부터
// 파티를 찾아볼까요?" answered with "응" must find its question. Expected values: the stored day Lookup's lines.
describe("A reply with the model's words and a Lookup, sent back", () => {
  const WORDS = '그 시간엔 자료구조 수업이 있어요. 수업이 끝나는 15:15부터 파티를 찾아볼까요?';
  const DAY = '11월 17일 화요일 수업 3개\n빈 시간 70분, 3시간 10분\n수업 사이 걸어서 15분, 12분';

  it("is the words first, then the Lookup's lines", () => {
    const [sent] = messagesToSend([reply(1, WORDS, { lookup: DAY_LOOKUP })]);

    expect(sent).toEqual({ role: 'assistant', text: `${WORDS}\n${DAY}`, cards: [] });
  });

  it("is the Lookup's lines alone when the model said nothing, or only the main server's stand-in sentence", () => {
    const [blank] = messagesToSend([reply(1, '  ', { lookup: DAY_LOOKUP })]);
    const [standIn] = messagesToSend([reply(2, '아래에서 확인해 보세요.', { lookup: DAY_LOOKUP })]);

    expect(blank).toEqual({ role: 'assistant', text: DAY, cards: [] });
    expect(standIn).toEqual({ role: 'assistant', text: DAY, cards: [] });
  });
});
