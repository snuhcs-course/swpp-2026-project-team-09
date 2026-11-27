/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, MealInput, ReplyStep } from '@/api/assistant-types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import {
  afterReply,
  conversationAnswersOf,
  stepsContextOf,
  withRecalculated,
} from '@/features/assistant/conversation-answers';
import type { ChatBubble } from '@/features/assistant/use-chat';

// The answers of the conversation on screen by their keys (P03 ticket 20): what each reply does to them, a
// recalculation's key, and what a request tells of the steps on screen.

const meal = (which: MealInput['meal'], from: string | null = null): MealInput => ({
  ...MEAL_ANSWER.input,
  meal: which,
  window: { ...MEAL_ANSWER.input.window, from },
});

const keyed = (key: string, input: MealInput): AnswerReply => ({ ...MEAL_ANSWER, input, key });

const LUNCH = keyed('lunch', meal('lunch'));
const DINNER = keyed('dinner', meal('dinner'));

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

const SEAT: ReplyStep = { ...stepOf('seat'), kind: 'seat', shows: { kind: 'card', key: 'book:7F' } };

type Bubble = Pick<ChatBubble, 'role' | 'failure' | 'own' | 'refusal' | 'answer' | 'answers' | 'withdrawn' | 'steps'>;

const reply = (more: Partial<Bubble>): Bubble => ({ role: 'assistant', failure: null, ...more });

const NONE = { answers: [], steps: null };

// Partitions of a reply: answers new, the same key again, a key withdrawn, a reply naming none of them, a reply without
// `answers`; and bubbles that are no reply.
describe("The conversation's answers", () => {
  it('take each answer of a reply in the place of the one of its key, or after them', () => {
    const first = afterReply(NONE, reply({ answers: [LUNCH, DINNER], steps: [stepOf('lunch'), stepOf('dinner')] }));
    const later = keyed('lunch', meal('lunch', '12:30'));

    const next = afterReply(first, reply({ answers: [later] }));

    expect(next.answers).toEqual([later, DINNER]);
  });

  it('keep the answers a reply does not name, and lose those it withdrew', () => {
    const first = afterReply(NONE, reply({ answers: [LUNCH, DINNER] }));

    expect(afterReply(first, reply({ answers: [] })).answers).toEqual([LUNCH, DINNER]);
    expect(afterReply(first, reply({ answers: [], withdrawn: ['dinner'] })).answers).toEqual([LUNCH]);
  });

  it('are the one answer of a reply without `answers`, as the app always drew it', () => {
    const first = afterReply(NONE, reply({ answers: [LUNCH, DINNER] }));

    expect(afterReply(first, reply({ answer: MEAL_ANSWER })).answers).toEqual([MEAL_ANSWER]);
    expect(afterReply(first, reply({ answer: null })).answers).toEqual([]);
  });

  it('take the steps of the last reply, whole, and none from one that gives none', () => {
    const steps = [SEAT, stepOf('dinner')];
    const first = afterReply(NONE, reply({ answers: [DINNER], steps }));

    expect(first.steps).toEqual(steps);
    expect(afterReply(first, reply({ answers: [] })).steps).toBeNull();
  });

  it("count no failure, no app's own bubble and no reply that keeps what is on screen", () => {
    const bubbles: Bubble[] = [
      reply({ answers: [LUNCH, DINNER] }),
      { ...reply({ answers: [] }), failure: 'unavailable' },
      { ...reply({ answers: [] }), own: true },
      reply({ answers: [], refusal: { kind: 'for-someone-else', lines: [], offers: [] } }),
      { role: 'user', failure: null },
    ];

    expect(conversationAnswersOf(bubbles).answers).toEqual([LUNCH, DINNER]);
  });
});

describe('A recalculated answer', () => {
  it('takes the place of the one recalculated under the key it came back with, and its step follows it', () => {
    const before = afterReply(NONE, reply({ answers: [LUNCH, DINNER], steps: [stepOf('lunch'), stepOf('dinner')] }));
    const together = keyed('lunch together', meal('lunch'));

    const after = withRecalculated(before, 'lunch', together);

    expect(after.answers.map(({ key }) => key)).toEqual(['lunch together', 'dinner']);
    expect(after.steps?.map(({ shows }) => shows)).toEqual([
      { kind: 'answer', key: 'lunch together' },
      { kind: 'answer', key: 'dinner' },
    ]);
  });

  it('keeps its key when it came back with none', () => {
    const before = afterReply(NONE, reply({ answers: [LUNCH] }));
    const { key: _key, ...bare } = LUNCH;

    expect(withRecalculated(before, 'lunch', bare).answers[0]?.key).toBe('lunch');
  });
});

describe('What a request tells of the steps on screen', () => {
  const onScreen = afterReply(
    NONE,
    reply({ answers: [LUNCH, DINNER], steps: [SEAT, stepOf('dinner'), stepOf('lunch')] }),
  );

  it("is every answer's conditions in the order of the steps, the one on screen as recalculated, and the steps", () => {
    const moved = meal('dinner', '18:30');

    expect(stepsContextOf(onScreen, { key: 'dinner', input: moved })).toEqual({
      answers: [moved, LUNCH.input],
      steps: [SEAT, stepOf('dinner'), stepOf('lunch')],
    });
  });

  it('is nothing without steps on screen, so that a single request is sent as before', () => {
    expect(stepsContextOf(afterReply(NONE, reply({ answers: [LUNCH] })), null)).toEqual({});
  });
});
