/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import type { AnswerReply } from '@/api/assistant-types';
import { STUDY_PLAN_ANSWER } from '@/api/mock/data/study-plan-answer';
import { type AnswerLabel, type AnswerSymbol, color, MapAnswerMark } from '@/design-system';
import { drawingOf } from '@/features/assistant/answer-marks';
import { drawsMeal } from '@/features/assistant/meal-marks';

// A study answer alone on the map (P10 ticket 17): the meal answer's marks in the study colour. Its places are numbered
// rounds with their walking in a capsule, the pick a solid round with its name and arrival time, the 공부공간 layer's
// book before that name; a place none may use but its students stays grey with its space and whose it is.

interface Mark {
  id: string;
  symbol: AnswerSymbol | null;
  label: AnswerLabel | null;
}

function marksOf(answer: AnswerReply, index: number): Mark[] {
  return drawingOf(answer, index).things.flatMap(({ id, look }) =>
    look.kind === 'answer' ? [{ id, symbol: look.symbol, label: look.label }] : [],
  );
}

function markOf(marks: Mark[], id: string): Mark {
  const found = marks.find((mark) => mark.id === id);
  if (found === undefined) {
    throw new Error(`No mark ${id}`);
  }
  return found;
}

const together: AnswerReply = { ...STUDY_PLAN_ANSWER, input: { ...STUDY_PLAN_ANSWER.input, together: true } };

// Partitions: a study answer alone; one together, which is the group study room's. Expected values: the stored answer.
describe('a study answer alone, drawn as a meal answer', () => {
  it('is drawn as a meal answer alone, not together', () => {
    expect(drawsMeal(STUDY_PLAN_ANSWER)).toBe(true);
    expect(drawsMeal(together)).toBe(false);
  });

  it('numbers its pick and its candidates in the study colour', () => {
    const marks = marksOf(STUDY_PLAN_ANSWER, 0);
    const pick = markOf(marks, 'answer:pick');
    // Each candidate is its round and, apart, its walking's capsule, which has no symbol of its own.
    const rounds = marks.flatMap(({ id, symbol }) =>
      id.startsWith('answer:candidate:') && symbol !== null ? [symbol] : [],
    );

    expect(pick.symbol).toMatchObject({ type: 'dot', role: 'pick', number: 1, meal: true, study: true });
    expect(rounds.map((symbol) => (symbol.type === 'dot' ? [symbol.number, symbol.study] : null))).toEqual([
      [2, true],
      [3, true],
      [4, true],
    ]);
  });

  it('labels its pick with the building and its arrival, in the study colour', () => {
    const { label } = markOf(marksOf(STUDY_PLAN_ANSWER, 1), 'answer:pick');

    expect(label).toMatchObject({ tone: 'pick', title: '관정관', note: '19:24', line: null, meal: true, study: true });
  });

  it('keeps a building none may use but its students grey, with its space and whose it is', () => {
    const { label } = markOf(marksOf(STUDY_PLAN_ANSWER, 0), 'answer:dropped:경영학도서관');

    expect(label).toMatchObject({ tone: 'dropped', title: '열람실 · 경영대학' });
  });
});

// Partitions: the pick's round, another place's round, and the pick's label. Expected values: the design system's study
// colours.
describe("a study answer's marks", () => {
  it('fills its pick in the study colour with a white number, and no book in the round', async () => {
    const pick: AnswerSymbol = { type: 'dot', role: 'pick', number: 1, meal: true, study: true };
    await render(<MapAnswerMark label={null} symbol={pick} testID="m" />);

    expect(screen.getByTestId('m:dot')).toHaveStyle({ backgroundColor: color.svcStudy });
    expect(screen.getByText('1')).toBeOnTheScreen();
    expect(screen.queryByTestId('m:book')).toBeNull();
  });

  it('rims another place in the study colour on its soft ground', async () => {
    const round: AnswerSymbol = { type: 'dot', role: 'candidate', number: 3, meal: true, study: true };
    await render(<MapAnswerMark label={null} symbol={round} testID="m" />);

    expect(screen.getByTestId('m:dot')).toHaveStyle({
      borderColor: color.svcStudy,
      backgroundColor: color.svcStudySoft,
    });
    expect(screen.getByText('3')).toHaveStyle({ color: color.svcStudy });
  });

  it('edges its pick’s label in the study colour, the 공부공간 book before the name', async () => {
    const label: AnswerLabel = {
      side: 'below',
      tone: 'pick',
      title: '관정관',
      line: null,
      note: '19:24',
      number: null,
      meal: true,
      study: true,
    };
    await render(<MapAnswerMark label={label} symbol={null} testID="m" />);

    expect(screen.getByTestId('m:label')).toHaveStyle({ borderColor: color.svcStudy });
    expect(screen.getByTestId('m:label:book')).toBeOnTheScreen();
  });
});
