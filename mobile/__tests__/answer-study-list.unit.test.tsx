/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, render, screen, within } from '@testing-library/react-native';

import { STUDY_PLAN_ANSWER } from '@/api/mock/data/study-plan-answer';
import { color } from '@/design-system';
import { MealList, mealCard } from '@/screens/main/answer/meal-list';

// A study answer alone raised (P10 ticket 18): the meal answer's list, its places in the main server's order. Each row is
// its number, its building, its best space with the server's words of its hours, and its way at the right; the kinds of
// space filter it on the phone; the places closed then under "쉬는 곳"; the places none may use but their students
// faded at the very end with the server's words, unnumbered.

function shownOf(): { index: number; openMenu: jest.Mock; show: jest.Mock; chooseKind: jest.Mock; change: jest.Mock } {
  return { index: 0, openMenu: jest.fn(), show: jest.fn(), chooseKind: jest.fn(), change: jest.fn() };
}

async function list(shown = shownOf()): Promise<ReturnType<typeof shownOf>> {
  await render(<MealList answer={STUDY_PLAN_ANSWER} busy={false} shown={shown} />);
  return shown;
}

function rowWords(number: number): string[] {
  return within(screen.getByTestId(`meal-row-${String(number)}`))
    .getAllByText(/./u)
    .map((node) => String(node.props.children));
}

// Partitions: the list's first line and its rows in order; a row with known hours, one without; the way at the right.
// Expected values: the stored answer.
describe("a study answer's list", () => {
  it('is a meal answer’s card', () => {
    expect(mealCard(STUDY_PLAN_ANSWER)).toBe(true);
  });

  it('counts its places in the main server’s order, the longest stay first', async () => {
    await list();

    expect(screen.getByTestId('meal-list-order')).toHaveTextContent('4곳 · 오래 머무는 순');
    expect([1, 2, 3, 4].map((number) => rowWords(number)[1])).toEqual([
      '공대 신양학술정보관',
      '관정관',
      '법학도서관',
      '인문대 신양학술정보관',
    ]);
  });

  it('says each place’s best space and its hours in the server’s words, and its way at the right', async () => {
    await list();

    expect(rowWords(1)).toEqual(['1', '공대 신양학술정보관', '3층 자유열람실 · 24시간', '걸음 2분']);
    expect(rowWords(4)).toEqual(['4', '인문대 신양학술정보관', '1층 라운지 · 여는 시간을 몰라요', '걸음 15분']);
  });

  it('marks the chosen place in the study colours', async () => {
    await list();

    expect(screen.getByTestId('meal-row-1')).toHaveStyle({
      borderColor: color.svcStudy,
      backgroundColor: color.svcStudySoft,
    });
    expect(within(screen.getByTestId('meal-row-1')).getByText('1').parent).toHaveStyle({
      backgroundColor: color.svcStudy,
    });
  });

  it('chooses a place at a press, its view being another ticket’s', async () => {
    const shown = await list();

    await fireEvent.press(screen.getByTestId('meal-row-3'));

    expect(shown.show).toHaveBeenCalledWith(STUDY_PLAN_ANSWER.plans[2]?.id);
    expect(shown.openMenu).not.toHaveBeenCalled();
  });
});

// Partitions: every kind; one kind chosen; the kind cleared. Expected values: the stored answer's spaces.
describe("a study answer's kinds of space", () => {
  it('offers every place and each kind with its count', async () => {
    await list();
    const chips = within(screen.getByTestId('kind-chips'));

    expect(chips.getByRole('button', { name: '전체 4곳' })).toBeSelected();
    expect(chips.getByRole('button', { name: '열람실 3곳' })).toBeOnTheScreen();
    expect(chips.getByRole('button', { name: '라운지 1곳' })).toBeOnTheScreen();
  });

  it('keeps the places of the kind chosen, on the phone, and every place again at 전체', async () => {
    const shown = await list();
    const chips = within(screen.getByTestId('kind-chips'));

    await fireEvent.press(chips.getByRole('button', { name: '라운지 1곳' }));
    expect(screen.getByTestId('meal-list-order')).toHaveTextContent('1곳 · 오래 머무는 순');
    expect(screen.getByTestId('meal-row-4')).toBeOnTheScreen();
    expect(screen.queryByTestId('meal-row-1')).toBeNull();

    await fireEvent.press(chips.getByRole('button', { name: '전체 4곳' }));
    expect(screen.getByTestId('meal-row-1')).toBeOnTheScreen();
    expect(shown.chooseKind).not.toHaveBeenCalled();
    expect(shown.change).not.toHaveBeenCalled();
  });
});

// Partitions: a place closed then; a place only its students may use. Expected values: the stored answer, the server's
// words.
describe("the places a study answer's list cannot offer", () => {
  it('lists the place closed then under 쉬는 곳', async () => {
    await list();

    expect(screen.getByText('쉬는 곳')).toBeOnTheScreen();
    expect(screen.getByLabelText('사회과학도서관 · 오늘 18:00에 닫았어요')).toBeOnTheScreen();
  });

  it('ends with the place only its students may use, faded and unnumbered, in the server’s words', async () => {
    await list();
    const rows = screen.getAllByTestId(/^meal-(closed|dropped)-row$/u);
    const last = rows.at(-1);

    expect(last).toHaveProp('accessibilityLabel', '경영학도서관 · 경영대학 학생만 쓸 수 있어요');
    expect(last).toHaveProp('testID', 'meal-dropped-row');
    expect(last).toHaveStyle({ opacity: 0.45 });
  });
});
