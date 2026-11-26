/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import { type AnswerLabel, color, MapAnswerMark } from '@/design-system';

// A meal answer's marks in coral (P04 ticket 85, the user's "3안"): a flag of the meal's rounds and of a meal pick's
// label, so that every other answer's pick stays gold.

// Partitions: a meal answer's pick and candidate, the pick of any other answer, a
// meal pick's label, and a candidate's round inside its capsule. Expected values: P04 ticket 85, the user's "3안".
describe('MapAnswerMark: a meal answer in coral', () => {
  it("fills a meal pick's round with coral and its number white", async () => {
    await render(
      <MapAnswerMark label={null} symbol={{ type: 'dot', role: 'pick', number: 1, meal: true }} testID="m" />,
    );

    expect(screen.getByTestId('m:dot')).toHaveStyle({ backgroundColor: color.meal });
    expect(screen.getByText('1')).toHaveStyle({ color: color.onPrimary });
  });

  it('keeps every other pick gold', async () => {
    await render(<MapAnswerMark label={null} symbol={{ type: 'dot', role: 'pick', number: 1 }} testID="m" />);

    expect(screen.getByTestId('m:dot')).toHaveStyle({ backgroundColor: color.quest });
  });

  it("draws a meal candidate's round with a coral rim, a soft ground, and a coral number, inside its white ring", async () => {
    const symbol = { type: 'dot', role: 'candidate', number: 3, meal: true } as const;
    await render(<MapAnswerMark label={null} symbol={symbol} testID="m" />);

    expect(screen.getByTestId('m:dot')).toHaveStyle({ backgroundColor: color.meal, borderColor: color.surface });
    expect(screen.getByText('3')).toHaveStyle({ color: color.meal });
    expect(screen.getByTestId('m:dot:ground')).toHaveStyle({ backgroundColor: color.mealSoft });
  });

  it("edges a meal pick's label with coral and keeps its time gold", async () => {
    const label: AnswerLabel = {
      side: 'below',
      tone: 'pick',
      title: '302동식당',
      note: '12:15',
      line: null,
      number: null,
    };
    await render(<MapAnswerMark label={label} symbol={null} testID="m" />);

    expect(screen.getByTestId('m:label')).toHaveStyle({ borderColor: color.meal });
    expect(screen.getByText(' 12:15')).toHaveStyle({ color: color.quest });
  });

  it("draws the round inside a candidate's capsule in coral", async () => {
    const minutes: AnswerLabel = { side: 'right', tone: 'minutes', title: '26분', line: null, number: 4 };
    await render(<MapAnswerMark label={minutes} symbol={null} testID="m" />);

    expect(screen.getByTestId('m:label:dot')).toHaveStyle({ backgroundColor: color.meal });
    expect(screen.getByText('4')).toHaveStyle({ color: color.meal });
  });

  it('gives a meal pick without a round of its own a coral number badge in its label', async () => {
    const label: AnswerLabel = {
      side: 'below',
      tone: 'pick',
      title: '302동식당',
      note: '12:15',
      line: null,
      number: 1,
    };
    await render(<MapAnswerMark label={label} symbol={null} testID="m" />);

    expect(screen.getByText('1').parent).toHaveStyle({ backgroundColor: color.meal });
  });
});
