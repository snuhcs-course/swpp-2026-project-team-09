/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, ReplyStep } from '@/api/assistant-types';
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
