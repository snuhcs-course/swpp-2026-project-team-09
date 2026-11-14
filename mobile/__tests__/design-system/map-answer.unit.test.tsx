/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import { ANSWER_SYMBOL_BOX, type AnswerLabel, color, MapAnswerMark } from '@/design-system';

const PLAIN: AnswerLabel = { side: 'right', tone: 'person', title: '민수 · 18분', line: null, number: null };

// Partitions: no symbol, the User, and a Friend's face with a solid or a dashed ring. Expected values: the brief's
// look of a mark and the wireframes.
describe("MapAnswerMark: a person's symbol", () => {
  it('keeps a symbol box of 36 by 36 when no symbol is drawn', async () => {
    await render(<MapAnswerMark label={PLAIN} symbol={null} testID="mark" />);

    expect(ANSWER_SYMBOL_BOX).toBe(36);
    expect(screen.getByTestId('mark:symbol')).toHaveStyle({ width: 36, height: 36 });
  });

  it("draws the User as the design system's own dot", async () => {
    await render(<MapAnswerMark label={null} symbol={{ type: 'me' }} />);

    expect(screen.getByLabelText('내 위치')).toBeVisible();
  });

  it("draws a Friend as a round of 36 with the name's first two letters and a solid ring", async () => {
    await render(<MapAnswerMark label={null} symbol={{ type: 'face', name: '김민준', dashed: false }} testID="mark" />);

    expect(screen.getByText('김민')).toBeVisible();
    expect(screen.getByTestId('mark:face')).toHaveStyle({
      width: 36,
      height: 36,
      borderWidth: 2,
      borderColor: color.friend,
      borderStyle: 'solid',
      backgroundColor: color.friendSoft,
    });
  });

  it('dashes the ring of a Friend whose position comes from the Timetable', async () => {
    await render(<MapAnswerMark label={null} symbol={{ type: 'face', name: '민수', dashed: true }} testID="mark" />);

    expect(screen.getByTestId('mark:face')).toHaveStyle({ borderStyle: 'dashed' });
  });
});

// Partitions: a dot of each role, with a number and without. Expected values: the brief's look of a mark and the
// wireframes.
describe('MapAnswerMark: a dot', () => {
  it('draws the pick as a round in the Quest colour with its number in white', async () => {
    await render(<MapAnswerMark label={null} symbol={{ type: 'dot', role: 'pick', number: 3 }} testID="mark" />);

    expect(screen.getByTestId('mark:dot')).toHaveStyle({ backgroundColor: color.quest });
    expect(screen.getByText('3')).toHaveStyle({ color: color.onPrimary });
  });

  it('draws a candidate as a smaller grey round with its number', async () => {
    await render(<MapAnswerMark label={null} symbol={{ type: 'dot', role: 'candidate', number: 4 }} testID="mark" />);

    expect(screen.getByTestId('mark:dot')).toHaveStyle({ backgroundColor: color.inkSubtle });
    expect(screen.getByText('4')).toBeVisible();
  });

  it('draws a Restaurant that does not fit as a small faint round without a number', async () => {
    await render(<MapAnswerMark label={null} symbol={{ type: 'dot', role: 'dropped', number: null }} testID="mark" />);

    expect(screen.getByTestId('mark:dot')).toHaveStyle({ backgroundColor: color.border });
    expect(screen.queryByText(/\d/u)).toBeNull();
  });

  it('draws the next Class as a navy square with round corners', async () => {
    await render(<MapAnswerMark label={null} symbol={{ type: 'dot', role: 'next', number: null }} testID="mark" />);

    expect(screen.getByTestId('mark:dot')).toHaveStyle({ backgroundColor: color.snuBlue });
    expect(screen.getByTestId('mark:dot')).not.toHaveStyle({ borderRadius: 999 });
  });
});

// Partitions: the four sides. Expected values: the brief's look of a mark.
describe("MapAnswerMark: a label's side", () => {
  it.each([
    ['right', 'row'],
    ['left', 'row-reverse'],
    ['below', 'column'],
    ['above', 'column-reverse'],
  ] as const)('puts a label on the side %s of the symbol box, 2 apart', async (side, direction) => {
    await render(<MapAnswerMark label={{ ...PLAIN, side }} symbol={null} testID="mark" />);

    expect(screen.getByTestId('mark')).toHaveStyle({ flexDirection: direction, gap: 2 });
  });
});

// Partitions: a plain tone and the pick's; a label with a line and without; with a number badge and without.
// Expected values: the brief's look of a mark.
describe("MapAnswerMark: a label's tone", () => {
  it('shows a plain label on one line, cut at 180 points', async () => {
    await render(<MapAnswerMark label={PLAIN} symbol={null} testID="mark" />);

    expect(screen.getByText('민수 · 18분')).toHaveProp('numberOfLines', 1);
    expect(screen.getByTestId('mark:label')).toHaveStyle({ maxWidth: 180, backgroundColor: color.surface });
    expect(screen.getByTestId('mark:label')).not.toHaveStyle({ borderColor: color.quest });
  });

  it("shows the pick's title, its line in the Quest colour, and its number, inside a Quest border", async () => {
    await render(
      <MapAnswerMark
        label={{ side: 'below', tone: 'pick', title: '302동식당', line: '12:15 점심', number: 1 }}
        symbol={null}
        testID="mark"
      />,
    );

    expect(screen.getByText('302동식당')).toBeVisible();
    expect(screen.getByText('12:15 점심')).toHaveStyle({ color: color.quest });
    expect(screen.getByText('1')).toBeVisible();
    expect(screen.getByTestId('mark:label')).toHaveStyle({ borderColor: color.quest });
  });

  it('shows a label without a number badge when its number is null', async () => {
    await render(<MapAnswerMark label={{ ...PLAIN, tone: 'candidate', title: '3식당' }} symbol={null} />);

    expect(screen.getByText('3식당')).toBeVisible();
    expect(screen.queryByText(/\d$/u)).toBeNull();
  });
});

// Partitions: the dark tone of a meeting flag and the muted one of a Restaurant that does not fit. Expected values:
// the brief's look of a mark.
describe("MapAnswerMark: a label's dark and muted tones", () => {
  it('shows a meeting flag in white words on the dark ink', async () => {
    await render(
      <MapAnswerMark
        label={{ ...PLAIN, side: 'above', tone: 'meeting', title: '12:18 민수와 만남' }}
        symbol={null}
        testID="mark"
      />,
    );

    expect(screen.getByTestId('mark:label')).toHaveStyle({ backgroundColor: color.ink });
    expect(screen.getByText('12:18 민수와 만남')).toHaveStyle({ color: color.onPrimary });
  });

  it('mutes the words of a Restaurant that does not fit', async () => {
    await render(
      <MapAnswerMark
        label={{ ...PLAIN, side: 'left', tone: 'dropped', title: '301동식당 · 5분밖에 못 있어요' }}
        symbol={null}
      />,
    );

    expect(screen.getByText('301동식당 · 5분밖에 못 있어요')).toHaveStyle({ color: color.inkMuted });
  });
});
