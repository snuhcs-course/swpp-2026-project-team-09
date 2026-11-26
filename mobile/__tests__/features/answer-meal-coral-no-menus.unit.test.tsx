/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import type { AnswerReply } from '@/api/assistant-types';
import { type AnswerLabel, color, MapAnswerMark } from '@/design-system';
import { drawingOf } from '@/features/assistant/answer-marks';
import { drawsMeal } from '@/features/assistant/meal-marks';

// A meal answer whose Plans carry no menu in coral (P04 ticket 90): the colour follows the answer's kind, as the list's
// does, not whether menus were posted. Its candidates keep their name tags (P04 ticket 13), only in the meal's colours.

interface Seen {
  role: string;
  // Null where its round is not drawn, as a candidate on another's point.
  meal: boolean | null;
  label: AnswerLabel | null;
}

// Every board's pick and candidates: whether each round or label is a meal's.
function marksOf(answer: AnswerReply): Seen[] {
  return answer.plans.flatMap((_, index) =>
    drawingOf(answer, index).things.flatMap(({ id, look }): Seen[] => {
      if (look.kind !== 'answer' || !(id === 'answer:pick' || id.startsWith('answer:candidate:'))) {
        return [];
      }
      const dot = look.symbol?.type === 'dot' ? look.symbol : null;
      const meal = dot === null ? null : dot.meal === true;
      return [{ role: id === 'answer:pick' ? 'pick' : 'candidate', meal, label: look.label }];
    }),
  );
}

// Partitions: a meal answer without menus; an answer other than a meal's. Expected values: the ticket.
describe("a meal answer's marks without menus", () => {
  it('are a meal answer with no menu', () => {
    expect(MEAL_ANSWER.input.kind).toBe('meal');
    expect(drawsMeal(MEAL_ANSWER)).toBe(false);
  });

  it('flag every round and every name tag as a meal’s', () => {
    const marks = marksOf(MEAL_ANSWER);
    const rounds = marks.filter(({ meal }) => meal !== null);
    const tags = marks.flatMap(({ label }) => (label === null ? [] : [label]));

    expect(rounds.length).toBeGreaterThan(0);
    expect(rounds.filter(({ meal }) => meal === false).map(({ role }) => role)).toEqual([]);
    expect(tags.length).toBeGreaterThan(0);
    expect(tags.every((label) => label.meal === true)).toBe(true);
  });

  it('keep every other answer’s pick gold', () => {
    expect(marksOf(MEET_ANSWER).some(({ meal, label }) => meal === true || label?.meal === true)).toBe(false);
  });
});

// Partitions: a meal candidate's name tag and a meal pick's label without a time; the same without the flag.
describe("a meal answer's labels without menus", () => {
  it('edge a candidate’s name tag in coral, its number soft coral with a coral number', async () => {
    const tag: AnswerLabel = { side: 'left', tone: 'candidate', title: '3식당', line: '12:30', number: 4, meal: true };
    await render(<MapAnswerMark label={tag} symbol={null} testID="m" />);

    expect(screen.getByTestId('m:label')).toHaveStyle({ borderColor: color.meal });
    expect(screen.getByText('4')).toHaveStyle({ color: color.meal });
    expect(screen.getByText('4').parent).toHaveStyle({ backgroundColor: color.mealSoft, borderColor: color.meal });
  });

  it('edge a pick’s label in coral, its number badge solid coral', async () => {
    const pick: AnswerLabel = {
      side: 'below',
      tone: 'pick',
      title: '302동식당 ›',
      line: '12:15',
      number: 1,
      meal: true,
    };
    await render(<MapAnswerMark label={pick} symbol={null} testID="m" />);

    expect(screen.getByTestId('m:label')).toHaveStyle({ borderColor: color.meal });
    expect(screen.getByText('1').parent).toHaveStyle({ backgroundColor: color.meal });
  });

  it('keep a label without the flag in its own colours', async () => {
    const tag: AnswerLabel = { side: 'left', tone: 'candidate', title: '3식당', line: '12:30', number: 4 };
    await render(<MapAnswerMark label={tag} symbol={null} testID="m" />);

    expect(screen.getByTestId('m:label')).toHaveStyle({ borderColor: color.snuBlue });
  });
});
