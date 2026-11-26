/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import { type AnswerLabel, color, MapAnswerMark, shadow } from '@/design-system';

// A meal candidate's numbered round (P04 ticket 91, the user's words on his phone): it read as three circles, a white
// ring with its shadow, the coral rim, and the soft ground. The coral rim is now its outside edge, and the round and its
// number take the white ring's room: the round is as wide as round and ring were, so capsules and placement keep it.

const ROUND = 20;
const RIM = 1.5;
const NUMBER_SIZE = 13;

// Partitions: the round alone on the map, alone where its minutes gave way, and inside its capsule. Expected values: the
// ticket's sizes, the footprint of the round with its white ring before.
describe("MapAnswerMark: a meal candidate's round without a white ring", () => {
  const minutes: AnswerLabel = { side: 'right', tone: 'minutes', title: '26분', line: null, number: 4 };
  const alone: AnswerLabel = { side: 'right', tone: 'minutes', title: '', line: null, number: 4 };

  it.each([
    ['alone on the map', { type: 'dot', role: 'candidate', number: 4, meal: true } as const, null, 'm:dot'],
    ['alone where its minutes gave way', null, alone, 'm:label:dot'],
    ['inside its capsule', null, minutes, 'm:label:dot'],
  ] as const)('is %s a soft ground in a coral rim, as wide as before', async (_, symbol, label, round) => {
    await render(<MapAnswerMark label={label} symbol={symbol} testID="m" />);

    expect(screen.getByTestId(round)).toHaveStyle({
      width: ROUND,
      height: ROUND,
      borderWidth: RIM,
      borderColor: color.meal,
      backgroundColor: color.mealSoft,
    });
    expect(screen.getByTestId(round)).not.toHaveStyle({ boxShadow: shadow.dot });
  });

  it.each([
    ['alone on the map', { type: 'dot', role: 'candidate', number: 4, meal: true } as const, null],
    ['inside its capsule', null, minutes],
  ] as const)('grows its number to the room the ring left, %s', async (_, symbol, label) => {
    await render(<MapAnswerMark label={label} symbol={symbol} testID="m" />);

    expect(screen.getByText('4')).toHaveStyle({
      width: ROUND - 2 * RIM,
      height: ROUND - 2 * RIM,
      fontSize: NUMBER_SIZE,
      color: color.meal,
    });
  });

  it('gives a two-digit number the same box and size', async () => {
    await render(
      <MapAnswerMark label={null} symbol={{ type: 'dot', role: 'candidate', number: 12, meal: true }} testID="m" />,
    );

    expect(screen.getByText('12')).toHaveStyle({ width: ROUND - 2 * RIM, fontSize: NUMBER_SIZE });
  });
});

// Partitions: the chosen meal round and another answer's candidate. Expected values: the ticket, which keeps their white
// ring: the chosen round is one solid disc in it, not a rim inside a ring.
describe('MapAnswerMark: the rounds that keep their white ring', () => {
  it.each([
    ['the chosen meal round', { type: 'dot', role: 'pick', number: 1, meal: true } as const, color.meal],
    ["another answer's candidate", { type: 'dot', role: 'candidate', number: 2 } as const, color.snuBlue],
  ] as const)('keeps it on %s', async (_, symbol, ground) => {
    await render(<MapAnswerMark label={null} symbol={symbol} testID="m" />);

    expect(screen.getByTestId('m:dot')).toHaveStyle({
      borderColor: color.surface,
      backgroundColor: ground,
      boxShadow: shadow.dot,
    });
  });
});
