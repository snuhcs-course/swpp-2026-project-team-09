/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import type { Plan } from '@/api/assistant-types';
import { MEAL_ANSWER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { MealMenu } from '@/screens/main/answer/meal-menu';
import { ignoreMark } from '@/screens/main/answer-presses';
import { freshWrapper } from './support/queries';

// An opened Restaurant is where the User comes to read its menu (P04 ticket 87, the user's phone): a dish cut with "…"
// ("콘마요핫도그, 웨지감자튀김, 미니토마…  6,500원") hid what it serves. Its dishes wrap onto as many lines as they need, the
// price at the right of their first line.

const MENU_SHOWN = { index: 0, closeMenu: ignoreMark };
const [FIRST] = MEAL_ANSWER_MENUS.plans;
if (FIRST === undefined) {
  throw new Error('The stored answer has no Plan');
}

const DISHES = '콘마요핫도그, 웨지감자튀김, 미니토마토파스타, 양배추샐러드';

function withDish(plan: Plan, name: string, price: number): Plan {
  return { ...plan, menu: { price: null, dishes: [{ name, price }] } };
}

// Partitions: a dish ordered at its own price, as the capture's. Expected values: the capture's dishes and price.
describe("an opened Restaurant's menu", () => {
  it('shows a long dish whole, on as many lines as it needs, with its price', async () => {
    await render(<MealMenu answer={MEAL_ANSWER_MENUS} plan={withDish(FIRST, DISHES, 6500)} shown={MENU_SHOWN} />, {
      wrapper: freshWrapper(),
    });

    const dish = screen.getByText(DISHES);
    expect(dish.props.numberOfLines).toBeUndefined();
    expect(dish).toHaveStyle({ flexShrink: 1 });
    expect(screen.getByText('6,500원')).toBeOnTheScreen();
  });
});
