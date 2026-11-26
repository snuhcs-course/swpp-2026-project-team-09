/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen, within } from '@testing-library/react-native';

import type { AnswerReply } from '@/api/assistant-types';
import { MEAL_ANSWER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { color } from '@/design-system';
import { MealList } from '@/screens/main/answer/meal-list';
import { MealMenu } from '@/screens/main/answer/meal-menu';
import { ignoreMark } from '@/screens/main/answer-presses';
import { freshWrapper } from './support/queries';

// A meal answer's list in coral (P04 ticket 85), as its map: the chosen row's number solid coral with a white number
// and its ground soft coral with a coral border in place of the gold; every other number soft coral with a coral rim
// and number.

const SHOWN = { index: 0, openMenu: ignoreMark, chooseKind: ignoreMark };
const MENU_SHOWN = { index: 0, closeMenu: ignoreMark };
const [PLAN] = MEAL_ANSWER_MENUS.plans;
if (PLAN === undefined) {
  throw new Error('The stored answer has no Plan');
}

// Partitions: the chosen row and another row. Expected values: the user's "3안".
describe("a meal answer's list", () => {
  it('marks the chosen Restaurant in coral, its number solid', async () => {
    await render(<MealList answer={MEAL_ANSWER_MENUS} busy={false} shown={SHOWN} />);
    const chosen = screen.getByTestId('meal-row-1');

    expect(chosen).toHaveStyle({ borderColor: color.meal, backgroundColor: color.mealSoft });
    expect(within(chosen).getByText('1')).toHaveStyle({ color: color.onPrimary });
    expect(within(chosen).getByText('1').parent).toHaveStyle({ backgroundColor: color.meal });
  });

  it('numbers every other Restaurant in soft coral with a coral number', async () => {
    await render(<MealList answer={MEAL_ANSWER_MENUS} busy={false} shown={SHOWN} />);
    const other = screen.getByTestId('meal-row-3');

    expect(other).not.toHaveStyle({ backgroundColor: color.mealSoft });
    expect(within(other).getByText('3')).toHaveStyle({ color: color.meal });
    expect(within(other).getByText('3').parent).toHaveStyle({
      backgroundColor: color.mealSoft,
      borderColor: color.meal,
    });
  });
});

// Partitions: a Restaurant opened from the list. Expected values: the chosen place's solid coral, its time gold.
describe("a meal answer's opened Restaurant", () => {
  it('numbers itself in solid coral, as the chosen place on the map', async () => {
    await render(<MealMenu answer={MEAL_ANSWER_MENUS} plan={PLAN} shown={MENU_SHOWN} />, { wrapper: freshWrapper() });

    expect(screen.getByTestId('meal-menu-number')).toHaveStyle({ backgroundColor: color.meal });
  });
});

// The stored answer with where the User starts not known and no next Class: no walking to say, so each row says when
// the User is there.
function withoutWays(answer: AnswerReply): AnswerReply {
  const plans = answer.plans.map((plan) => ({
    ...plan,
    parts: plan.parts.map((part) => (part.me ? Object.assign({}, part, { walkMinutes: null, origin: null }) : part)),
    scene: { ...plan.scene, routes: plan.scene.routes.filter(({ role }) => role !== 'next') },
  }));
  return { ...answer, plans };
}

// Partitions: a row's way ("걸음 N분") and a row's clock time ("11:53 도착"). Expected values: the user's decision on the
// coral screens (2026-11-26), the way in the name's ink and gold for clock times alone.
describe("a meal answer's list rows' second line", () => {
  it('says the way in ink, as the name', async () => {
    await render(<MealList answer={MEAL_ANSWER_MENUS} busy={false} shown={SHOWN} />);
    const line = screen.getByTestId('meal-row-3-when');

    expect(line).toHaveTextContent(/^걸음 \d+분$/u);
    expect(line).toHaveStyle({ color: color.ink });
  });

  it('keeps a clock time gold', async () => {
    await render(<MealList answer={withoutWays(MEAL_ANSWER_MENUS)} busy={false} shown={SHOWN} />);
    const line = screen.getByTestId('meal-row-3-when');

    expect(line).toHaveTextContent(/^\d{2}:\d{2} 도착$/u);
    expect(line).toHaveStyle({ color: color.quest });
  });
});
