/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import { type AnswerLabel, color, MapAnswerMark } from '@/design-system';

// The 관정 booking's mark (P01 ticket 10): the meal pick's round and label in the study colour, the round with the study
// layer's book inside.

// Partitions: a study pick's round and label, and any other pick. Expected values: the user's decision of 2026-11-27.
describe('MapAnswerMark: a study pick', () => {
  it("fills the round with the study colour and draws the layer's book in it, with no number", async () => {
    await render(
      <MapAnswerMark label={null} symbol={{ type: 'dot', role: 'pick', number: null, study: true }} testID="m" />,
    );

    expect(screen.getByTestId('m:dot')).toHaveStyle({ backgroundColor: color.svcStudy });
    expect(screen.getByTestId('m:book')).toBeOnTheScreen();
  });

  it('keeps every other pick gold, with no book', async () => {
    await render(<MapAnswerMark label={null} symbol={{ type: 'dot', role: 'pick', number: null }} testID="m" />);

    expect(screen.getByTestId('m:dot')).toHaveStyle({ backgroundColor: color.quest });
    expect(screen.queryByTestId('m:book')).toBeNull();
  });

  it('edges the label with the study colour, keeps the start gold, and ends the line with ›', async () => {
    const label: AnswerLabel = {
      side: 'below',
      tone: 'pick',
      title: '관정 7층 노트북존',
      note: '22:00',
      line: '7800번 · 빈 자리 171석',
      action: '›',
      number: null,
      study: true,
    };
    await render(<MapAnswerMark label={label} symbol={null} testID="m" />);

    expect(screen.getByTestId('m:label')).toHaveStyle({ borderColor: color.svcStudy });
    expect(screen.getByText(' 22:00')).toHaveStyle({ color: color.quest });
    expect(screen.getByText(' ›')).toBeOnTheScreen();
  });
});
