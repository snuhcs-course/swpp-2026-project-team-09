/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';
import { StyleSheet, type TextStyle } from 'react-native';

import { MEAL_ANSWER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { type AnswerLabel, type AnswerSymbol, MapAnswerMark } from '@/design-system';
import { MealList } from '@/screens/main/answer/meal-list';
import { ignoreMark } from '@/screens/main/answer-presses';

// A number in a round of a fixed size (P04 ticket 88): on the user's phone, at a font size of about 1.3, the numbers
// of the soft coral rounds sat low and to the right, their text grown past the 13-point inside of the round. A round
// keeps its size at any font size, so its number does too, in a box the round's inside, centred without font padding.

interface Centred {
  scales: boolean | undefined;
  style: TextStyle;
}

function numberOf(digits: string): Centred {
  const text = screen.getByText(digits);
  return { scales: text.props.allowFontScaling as boolean | undefined, style: StyleSheet.flatten(text.props.style) };
}

// The inside of a round: its size less its rings.
function expectCentredIn({ scales, style }: Centred, inside: number): void {
  expect(scales).toBe(false);
  expect(style).toMatchObject({
    width: inside,
    height: inside,
    lineHeight: inside,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  });
}

// Partitions: a meal candidate's coral round, a navy candidate's, a pick's, a capsule's round, and a label's badge.
// Expected values: each round's size less its white ring of 2 and, for the coral one, its rim of 1.5.
describe('a number in a round on the map', () => {
  it.each([
    ['a meal candidate’s coral round', { type: 'dot', role: 'candidate', number: 3, meal: true }, 13],
    ['a candidate’s navy round', { type: 'dot', role: 'candidate', number: 3 }, 16],
    ['the pick’s round', { type: 'dot', role: 'pick', number: 3, meal: true }, 26],
  ] as const)('keeps its size and is centred in %s', async (_, symbol: AnswerSymbol, inside) => {
    await render(<MapAnswerMark label={null} symbol={symbol} />);

    expectCentredIn(numberOf('3'), inside);
  });

  it('keeps its size and is centred in the round inside a capsule and in a label’s badge', async () => {
    const capsule: AnswerLabel = { side: 'right', tone: 'minutes', title: '26분', line: null, number: 4 };
    const pick: AnswerLabel = { side: 'below', tone: 'pick', title: '302동식당', note: '12:15', line: null, number: 1 };
    await render(
      <>
        <MapAnswerMark label={capsule} symbol={null} />
        <MapAnswerMark label={pick} symbol={null} />
      </>,
    );

    expectCentredIn(numberOf('4'), 13);
    expectCentredIn(numberOf('1'), 16);
  });
});

// Partitions: the chosen row's badge and another row's. Expected values: the badge of 22 less its rim of 1.5.
describe('a number in a meal list’s badge', () => {
  it('keeps its size and is centred, chosen or not', async () => {
    const shown = { index: 0, openMenu: ignoreMark, chooseKind: ignoreMark };
    await render(<MealList answer={MEAL_ANSWER_MENUS} busy={false} shown={shown} />);

    expectCentredIn(numberOf('1'), 19);
    expectCentredIn(numberOf('3'), 19);
  });
});
