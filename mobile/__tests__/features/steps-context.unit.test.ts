/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, ReplyStep } from '@/api/assistant-types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { contextFor } from '@/features/assistant/request-context';
import { contextAt } from '@/screens/main/use-context-chat';

// What a request of this app tells of the steps on screen, now that it says `answers` (P03 tickets 20 and 22): every
// answer's conditions in the order of the steps, and the steps whole. Until ticket 22 it told nothing. The whole flow is
// checked against the fake main server (`answer-steps-context.integration`).

const LUNCH: AnswerReply = { ...MEAL_ANSWER, key: 'lunch' };
const DINNER: AnswerReply = { ...MEAL_ANSWER, input: { ...MEAL_ANSWER.input, meal: 'dinner' }, key: 'dinner' };

const stepOf = (key: string): ReplyStep => ({
  kind: 'meal',
  title: key,
  place: null,
  from: null,
  startAt: null,
  endAt: null,
  status: 'shown',
  reason: null,
  shows: { kind: 'answer', key },
});

const REPLY: ChatBubble = {
  id: 2,
  role: 'assistant',
  text: '점심과 저녁을 짰어요.',
  cards: [],
  mapButtons: [],
  proposal: null,
  failure: null,
  answer: DINNER,
  answers: [LUNCH, DINNER],
  steps: [stepOf('lunch'), stepOf('dinner')],
};

describe('A request of this app with steps on screen', () => {
  it("tells every answer's conditions in the order of the steps, and the steps whole", () => {
    const where = { position: null, locationMissing: null };

    const context = contextAt(where, null, { tapped: null, viewport: null }, [REPLY]);

    expect(context).toMatchObject({
      answers: [LUNCH.input, DINNER.input],
      steps: [stepOf('lunch'), stepOf('dinner')],
    });
  });

  it('tells nothing more with one answer on screen', () => {
    const where = { position: null, locationMissing: null };
    const one: ChatBubble = { ...REPLY, answer: LUNCH, answers: [LUNCH], steps: undefined };

    const context = contextAt(where, null, { tapped: null, viewport: null }, [one]);

    expect(context).not.toHaveProperty('answers');
    expect(context).not.toHaveProperty('steps');
  });
});

// The user's phone on 2026-11-28: after "＋ 새 대화" the first request still told the old conversation's steps, and the
// main server planned the new request into them. Partitions: the steps kept on screen of this conversation, of another
// one; a conversation with no reply yet.
describe("A request tells no other conversation's steps", () => {
  const where = { position: null, locationMissing: null };
  const pressed = { tapped: null, viewport: null };
  const kept = { of: REPLY.id, answers: [LUNCH], steps: [stepOf('lunch'), stepOf('dinner')] };

  it('tells the steps kept on screen of this conversation', () => {
    expect(contextAt(where, null, pressed, [REPLY], kept)).toMatchObject({ answers: [LUNCH.input] });
  });

  it('never the steps kept on screen of another conversation', () => {
    const asked: ChatBubble = { ...REPLY, id: 9, role: 'user', answers: undefined, steps: undefined, answer: null };

    const context = contextAt(where, null, pressed, [asked], kept);

    expect(context).not.toHaveProperty('answers');
    expect(context).not.toHaveProperty('steps');
  });

  it('never from a conversation with no reply yet', () => {
    const asked: ChatBubble = { ...REPLY, id: 9, role: 'user' };
    const told = contextAt(where, null, pressed, [REPLY], kept);

    const context = contextFor(told, [asked]);

    expect(context).not.toHaveProperty('answers');
    expect(context).not.toHaveProperty('steps');
  });
});
