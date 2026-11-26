/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import type { AnswerReply } from '@/api/assistant-types';
import { MEAL_ANSWER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { type AnswerLabel, color, MapAnswerMark } from '@/design-system';
import { drawingOf } from '@/features/assistant/answer-marks';
import { lookName } from '@/map/marker-looks';
import { minutesOf } from '../support/answer-marks';

// A clock time in a candidate's capsule (P04 ticket 88): where the User's start is not known and no fixed thing follows
// the meal, a candidate's capsule says when it starts ("17:00") in place of the walking it adds. The user's decision: a
// clock time is gold, as every other clock time; the walking minutes stay ink.

// The stored answer with the User's start not known and no next Class: no walking to say.
function withoutWays(answer: AnswerReply): AnswerReply {
  const plans = answer.plans.map((plan) => ({
    ...plan,
    parts: plan.parts.map((part) => (part.me ? Object.assign({}, part, { walkMinutes: null, origin: null }) : part)),
    scene: { ...plan.scene, routes: plan.scene.routes.filter(({ role }) => role !== 'next') },
  }));
  return { ...answer, plans };
}

function capsuleOf(title: string, clock: boolean): AnswerLabel {
  return { side: 'right', tone: 'minutes', title, line: null, number: null, ...(clock ? { clock } : {}) };
}

// Partitions: a candidate with its walking known, and one with its clock time. Expected values: the user's decision.
describe("a candidate's capsule", () => {
  it('marks a clock time as one, and walking minutes not', () => {
    expect(minutesOf(drawingOf(withoutWays(MEAL_ANSWER_MENUS), 0), '학생회관식당')).toMatchObject({
      title: expect.stringMatching(/^\d{2}:\d{2}$/u) as unknown,
      clock: true,
    });
    expect(minutesOf(drawingOf(MEAL_ANSWER_MENUS, 0), '학생회관식당')).not.toHaveProperty('clock');
  });

  it.each([
    ['a clock time in gold', capsuleOf('17:00', true), color.quest],
    ['walking minutes in ink', capsuleOf('12분', false), color.ink],
  ])('draws %s', async (_, label, ink) => {
    await render(<MapAnswerMark label={label} symbol={null} testID="m" />);

    expect(screen.getByTestId('m:minutes')).toHaveStyle({ color: ink });
  });

  it('is one picture for every candidate with the same time, apart from the same words as minutes', () => {
    const time = { kind: 'answer', symbol: null, label: capsuleOf('17:00', true) } as const;

    expect(lookName(time)).toBe(lookName({ ...time, label: capsuleOf('17:00', true) }));
    expect(lookName(time)).not.toBe(lookName({ ...time, label: capsuleOf('17:00', false) }));
  });
});
