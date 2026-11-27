/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, render, screen, within } from '@testing-library/react-native';

import type { AnswerReply, MealInput, PlanInput } from '@/api/assistant-types';
import { MEAL_DINNER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { pricedAnswer } from '@/api/mock/data/meal-price-answer';
import { type AnswerDrawing, drawingOf } from '@/features/assistant/answer-marks';
import { MealList } from '@/screens/main/answer/meal-list';
import { ignoreMark } from '@/screens/main/answer-presses';
import { seen } from './support/answer-marks';

// A meal's price condition on the list and the map (P04 ticket 92, the design page "밥 조건 두 가지" § 2, board 제안).
// The stored dinner: 302동식당 6,000원, 301동식당 5,000원, 학생회관식당 4,500원, 3식당 5,500원, 자하연식당 2층 7,000원.

const asked = (condition: Pick<MealInput, 'maxPrice' | 'cheapFirst'>): AnswerReply & { input: MealInput } =>
  pricedAnswer(MEAL_DINNER_MENUS, condition);

type Change = (alter: (input: PlanInput) => PlanInput) => void;

async function listOf(answer: AnswerReply, change: Change = ignoreMark): Promise<void> {
  const shown = { index: 0, openMenu: ignoreMark, chooseKind: ignoreMark, change };
  await render(<MealList answer={answer} busy={false} shown={shown} />);
}

// Partitions: a ceiling two fit. Expected values: board 제안.
describe('A meal list with a price ceiling some fit', () => {
  it('shows the ceiling as a chip before the kinds, which count the fitting places', async () => {
    await listOf(asked({ maxPrice: 5000 }));

    expect(screen.getByLabelText('5,000원 이하 조건 빼기')).toBeOnTheScreen();
    expect(screen.getByText('전체 2')).toBeOnTheScreen();
    expect(screen.getByTestId('meal-list-order')).toHaveTextContent(/^2곳 · /u);
  });

  it("writes each fitting row's dish and price in place of its dishes, and no price at the end", async () => {
    await listOf(asked({ maxPrice: 5000 }));

    expect(within(screen.getByTestId('meal-row-1')).getByText('짜장면 5,000원')).toBeOnTheScreen();
    expect(within(screen.getByTestId('meal-row-2')).getByText('떡볶이&튀김 4,500원')).toBeOnTheScreen();
    expect(within(screen.getByTestId('meal-row-1')).queryByText('5,000원')).toBeNull();
    expect(screen.queryByTestId('meal-row-3')).toBeNull();
  });

  it('puts the places over it apart at the end, grey and unnumbered, under the price', async () => {
    await listOf(asked({ maxPrice: 5000 }));

    expect(screen.getByText('5,000원 넘는 곳')).toBeOnTheScreen();
    const over = screen.getAllByTestId('meal-over-row');
    expect(over).toHaveLength(3);
    expect(within(over[0] ?? screen.root).getByText('302동식당')).toBeOnTheScreen();
    expect(within(over[0] ?? screen.root).getByText('6,000원부터')).toBeOnTheScreen();
  });

  it('takes the ceiling away with its ✕, by a recalculation of the conditions without it', async () => {
    const change = jest.fn<undefined, Parameters<Change>>();
    await listOf(asked({ maxPrice: 5000 }), change);

    await fireEvent.press(screen.getByLabelText('5,000원 이하 조건 빼기'));

    expect(change).toHaveBeenCalledTimes(1);
    const alter = change.mock.calls[0]?.[0];
    expect(alter?.(asked({ maxPrice: 5000 }).input)).not.toHaveProperty('maxPrice');
  });
});

// Partitions: a ceiling none fits, cheapFirst alone, and no condition. Expected values: the ticket.
describe('A meal list ordered by price or with no condition', () => {
  it('numbers every place cheapest first when none is under the ceiling, the chip kept', async () => {
    await listOf(asked({ maxPrice: 3000 }));

    expect(screen.getByLabelText('3,000원 이하 조건 빼기')).toBeOnTheScreen();
    expect(screen.queryByText('3,000원 넘는 곳')).toBeNull();
    expect(within(screen.getByTestId('meal-row-1')).getByText('학생회관식당')).toBeOnTheScreen();
    expect(screen.getByTestId('meal-row-5')).toBeOnTheScreen();
    expect(screen.getByTestId('meal-list-order')).toHaveTextContent('5곳 · 싼 순');
  });

  it('shows 싼 순 as a chip and as the order, cheapest first', async () => {
    await listOf(asked({ cheapFirst: true }));

    expect(screen.getByLabelText('싼 순 조건 빼기')).toBeOnTheScreen();
    expect(screen.getByTestId('meal-list-order')).toHaveTextContent('5곳 · 싼 순');
    expect(within(screen.getByTestId('meal-row-1')).getByText('학생회관식당')).toBeOnTheScreen();
  });

  it('is as before without a condition', async () => {
    await listOf(MEAL_DINNER_MENUS);

    expect(screen.queryByLabelText(/조건 빼기$/u)).toBeNull();
    expect(screen.queryAllByTestId('meal-over-row')).toHaveLength(0);
    expect(screen.getByText('전체 5')).toBeOnTheScreen();
  });
});

// The number a mark shows, on its round or, where its round is not drawn, on its label.
function numberOn(drawing: AnswerDrawing, id: string): number | null {
  const { symbol, label } = seen(drawing, id);
  return (symbol?.type === 'dot' ? symbol.number : null) ?? label?.number ?? null;
}

// Partitions: the fitting places, those over the ceiling, and the same answer without it. Expected values: the
// orchestrator's rule of the meal map, which shows only the places the User can choose now: as the places closed for
// the meal, those over the price have no mark, and the camera frames the fitting ones.
describe('The map of a meal answer with a price ceiling', () => {
  const OVER = ['302동식당', '3식당', '자하연식당 2층'];

  it('numbers the fitting places alone', () => {
    const drawing = drawingOf(asked({ maxPrice: 5000 }), 0);

    expect(numberOn(drawing, 'answer:pick')).toBe(1);
    expect(numberOn(drawing, 'answer:candidate:학생회관식당')).toBe(2);
  });

  it('draws no mark of a place over the price, and frames none of them', () => {
    const answer = asked({ maxPrice: 5000 });
    const drawing = drawingOf(answer, 0);
    // 302동식당 stands where 302동 is, which the Friend's Class and its way on still mark: the other two are framed by
    // nothing else.
    const alone = new Set(['3식당', '자하연식당 2층']);
    const overAt = new Set(
      answer.plans
        .filter(({ id }) => alone.has(id))
        .map(({ place }) => `${String(place.latitude)},${String(place.longitude)}`),
    );

    expect(drawing.things.filter(({ id }) => OVER.some((name) => id.startsWith(`answer:candidate:${name}`)))).toEqual(
      [],
    );
    expect(
      drawing.points.filter(({ latitude, longitude }) => overAt.has(`${String(latitude)},${String(longitude)}`)),
    ).toEqual([]);
  });

  it('draws them again as candidates once the ceiling is taken away', () => {
    // 301동식당 shown, the second of the stored order, so that the three are candidates.
    const drawing = drawingOf(pricedAnswer(MEAL_DINNER_MENUS, {}), 1);

    expect(OVER.every((name) => drawing.things.some(({ id }) => id === `answer:candidate:${name}`))).toBe(true);
  });
});
