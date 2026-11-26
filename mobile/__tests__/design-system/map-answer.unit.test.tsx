/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import { ANSWER_SYMBOL_BOX, type AnswerLabel, CAPSULE, color, MapAnswerMark } from '@/design-system';

const PLAIN: AnswerLabel = { side: 'right', tone: 'person', title: '민수 · 18분', line: null, number: null };

// Partitions: no symbol, the User, and a Friend's face with a solid or a dashed ring. Expected values: the brief's
// look of a mark and the wireframes, and ticket 18's letters in a face, the everyday Avatar's.
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

  it("draws a Friend as a round of 36 with the everyday Avatar's letters and a solid ring", async () => {
    await render(<MapAnswerMark label={null} symbol={{ type: 'face', name: '김민준', dashed: false }} testID="mark" />);

    expect(screen.getByText('민준')).toBeVisible();
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

// Partitions: a face without a badge, with "?" for an invitation that waits, and with "✓" for an acceptance.
// Expected values: the P02 spec, "How each Friend stands", and the wireframe of the card after inviting.
describe("MapAnswerMark: a Friend's badge", () => {
  it('draws no badge on a face without one', async () => {
    await render(<MapAnswerMark label={null} symbol={{ type: 'face', name: '민수', dashed: true }} testID="mark" />);

    expect(screen.queryByTestId('mark:badge')).toBeNull();
  });

  it.each([
    ['waiting', '?', color.inkMuted],
    ['accepted', '✓', color.friend],
  ] as const)('draws the badge %s as "%s" at the upper right of the symbol box', async (badge, sign, tone) => {
    await render(
      <MapAnswerMark label={null} symbol={{ type: 'face', name: '민수', dashed: true, badge }} testID="mark" />,
    );

    expect(screen.getByText(sign)).toBeVisible();
    expect(screen.getByTestId('mark:badge')).toHaveStyle({
      position: 'absolute',
      top: 0,
      right: 0,
      backgroundColor: tone,
    });
  });
});

// Partitions: a face at the building level, one at the exact level, and one at the exact level with a badge.
// Expected values: P02 ticket 20 and board a13, a green round of 11 in the live colour with a white ring of 2 at the
// face's lower right, as the wireframe kit draws it, apart from the badge at its upper right.
describe("MapAnswerMark: a Friend's green dot", () => {
  it('draws no dot on a face at the building level', async () => {
    await render(<MapAnswerMark label={null} symbol={{ type: 'face', name: '민수', dashed: false }} testID="mark" />);

    expect(screen.queryByTestId('mark:exact')).toBeNull();
  });

  it('draws the dot at the lower right of the symbol box on a face at the exact level', async () => {
    await render(
      <MapAnswerMark label={null} symbol={{ type: 'face', name: '지은', dashed: false, exact: true }} testID="mark" />,
    );

    expect(screen.getByText('지은')).toBeVisible();
    expect(screen.getByTestId('mark:exact')).toHaveStyle({
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 11,
      height: 11,
      borderWidth: 2,
      borderColor: color.surface,
      backgroundColor: color.live,
    });
  });

  it('keeps the badge at the upper right beside the dot', async () => {
    await render(
      <MapAnswerMark
        label={null}
        symbol={{ type: 'face', name: '지은', dashed: false, exact: true, badge: 'accepted' }}
        testID="mark"
      />,
    );

    expect(screen.getByTestId('mark:badge')).toHaveStyle({ top: 0, right: 0 });
    expect(screen.getByTestId('mark:exact')).toHaveStyle({ bottom: 0, right: 0 });
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

  it('draws a candidate as a smaller navy round with its number (boards 20 and 21)', async () => {
    await render(<MapAnswerMark label={null} symbol={{ type: 'dot', role: 'candidate', number: 4 }} testID="mark" />);

    expect(screen.getByTestId('mark:dot')).toHaveStyle({ backgroundColor: color.snuBlue });
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

// Partitions: a label moved to share an edge at the left of its mark and at the right. Expected values:
// ticket 08's labels sharing an edge, the move away from the symbol box.
describe("MapAnswerMark: a label's shift", () => {
  it('stands a label at the left its shift further from the symbol box', async () => {
    await render(<MapAnswerMark label={{ ...PLAIN, side: 'left', shift: 9 }} symbol={null} testID="mark" />);

    expect(screen.getByTestId('mark:label')).toHaveStyle({ marginRight: 9 });
  });

  it('stands a label at the right its shift further from the symbol box', async () => {
    await render(<MapAnswerMark label={{ ...PLAIN, shift: 2 }} symbol={null} testID="mark" />);

    expect(screen.getByTestId('mark:label')).toHaveStyle({ marginLeft: 2 });
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

// Partitions: the way there and the way on. Expected values: P04 ticket 76's pills, which follow their leg, by the
// shuttle too: the way there's dark with white words, the way on's pale with dark words.
describe("MapAnswerMark: a leg's pill", () => {
  it.each([
    ['leg', '15분', color.snuBlue, color.onPrimary],
    ['legOn', '17분', color.blue100, color.snuBlue],
  ] as const)('draws a %s pill "%s" on %s in %s words', async (tone, title, ground, words) => {
    await render(<MapAnswerMark label={{ ...PLAIN, side: 'above', tone, title }} symbol={null} testID="mark" />);

    expect(screen.getByTestId('mark:label')).toHaveStyle({ backgroundColor: ground });
    expect(screen.getByText(title)).toHaveStyle({ color: words });
  });
});

// Partitions: a capsule running to the right and to the left. Expected values: the board of P04 ticket 83, a white
// capsule with the light border, as high as the round's room, holding the minutes in ink and no number.
describe("MapAnswerMark: a meal candidate's minutes", () => {
  it.each(['right', 'left'] as const)('is a capsule of the minutes alone, running to the %s', async (side) => {
    const minutes: AnswerLabel = { side, tone: 'minutes', title: '19분', line: null, number: null };
    await render(<MapAnswerMark label={minutes} symbol={null} testID="mark" />);

    expect(screen.getByTestId('mark')).toHaveStyle({
      minHeight: CAPSULE,
      flexDirection: side === 'left' ? 'row-reverse' : 'row',
      backgroundColor: color.surface,
      borderColor: color.border,
    });
    expect(screen.getByTestId('mark:minutes')).toHaveTextContent('19분');
    expect(screen.getByTestId('mark:minutes')).toHaveStyle({ color: color.ink });
    expect(screen.queryByTestId('mark:symbol')).toBeNull();
    expect(screen.queryByText(/^\d+$/u)).toBeNull();
  });
});

// Partitions: a candidate without a round of its own, with its minutes and with them given way. Expected values: the
// orchestrator's decision (P04 ticket 83), its numbered round inside the capsule, or the round alone with its white ring.
describe("MapAnswerMark: a meal candidate's minutes beside a spot another mark holds", () => {
  it('holds the numbered round inside the capsule', async () => {
    const minutes: AnswerLabel = { side: 'right', tone: 'minutes', title: '26분', line: null, number: 4 };
    await render(<MapAnswerMark label={minutes} symbol={null} testID="mark" />);

    expect(screen.getByTestId('mark:label:dot')).toHaveTextContent('4');
    expect(screen.getByTestId('mark:label:minutes')).toHaveTextContent('26분');
    expect(screen.getByTestId('mark:label')).toHaveStyle({ borderColor: color.border });
  });

  it('is the numbered round alone when its minutes give way', async () => {
    const number: AnswerLabel = { side: 'right', tone: 'minutes', title: '', line: null, number: 7 };
    await render(<MapAnswerMark label={number} symbol={null} testID="mark" />);

    expect(screen.getByTestId('mark:label:dot')).toHaveTextContent('7');
    expect(screen.getByTestId('mark:label:dot')).toHaveStyle({ width: 20, backgroundColor: color.meal });
    expect(screen.queryByTestId('mark:label:minutes')).toBeNull();
  });
});

// Partitions: a meal answer's pick and candidate, the pick of any other answer, the ring of a meal pick just chosen, a
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

  it("spreads a meal pick's ring in coral", async () => {
    const symbol = { type: 'dot', role: 'pick', number: 1, meal: true, ring: 0.2 } as const;
    await render(<MapAnswerMark label={null} symbol={symbol} testID="m" />);

    expect(screen.getByTestId('m:dot:ring')).toHaveStyle({ borderColor: color.meal });
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
