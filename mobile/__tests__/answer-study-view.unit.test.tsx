/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen, within } from '@testing-library/react-native';

import type { Plan } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { STUDY_PLAN_ANSWER } from '@/api/mock/data/study-plan-answer';
import { color } from '@/design-system';
import { MealMenu } from '@/screens/main/answer/meal-menu';
import { ignoreMark, type OnMark, withMealMenu } from '@/screens/main/answer-presses';
import { freshWrapper } from './support/queries';

// A study place opened (P10 ticket 19): the meal answer's view of a Restaurant, with the place's spaces and their hours
// where a Restaurant has its menu. Back to the list, its number in the study colour, its building, and its line: the
// way there, then until when and how long the User can stay. A press on the chosen place's mark opens it too.

const PLANS = STUDY_PLAN_ANSWER.plans;

function planAt(index: number): Plan {
  const plan = PLANS[index];
  if (plan === undefined) {
    throw new Error(`The stored study answer has no Plan ${String(index + 1)}`);
  }
  return plan;
}

async function opened(index: number): Promise<void> {
  await render(<MealMenu answer={STUDY_PLAN_ANSWER} plan={planAt(index)} shown={{ index, closeMenu: ignoreMark }} />, {
    wrapper: freshWrapper(),
  });
}

// Partitions: a place with its hours known; one without them. Expected values: the stored answer's spaces, walks and
// stays (공대 신양학술정보관 19:12–22:12, 2 minutes' walk; 인문대 신양학술정보관 19:25–22:25, 15 minutes').
describe('a study place opened', () => {
  it('heads with the way back, its number in the study colour, its building, and its walk and stay', async () => {
    await opened(0);

    expect(screen.getByTestId('meal-menu-back')).toHaveTextContent('‹ 4곳 목록');
    expect(screen.getByTestId('meal-menu-number')).toHaveStyle({ backgroundColor: color.svcStudy });
    expect(screen.getByRole('header', { name: '공대 신양학술정보관' })).toBeOnTheScreen();
    expect(screen.getByText('걸음 2분 · 22:12까지 3시간')).toBeOnTheScreen();
  });

  it('lists its spaces, each by name with its hours, where a Restaurant has its menu', async () => {
    await opened(0);
    const spaces = within(screen.getByTestId('study-spaces'));

    expect(spaces.getByText('3층 자유열람실')).toBeOnTheScreen();
    expect(spaces.getByText('학기 중 24시간 · 방학 08:00–24:00')).toBeOnTheScreen();
    expect(screen.queryByText('이날 메뉴를 아직 몰라요')).toBeNull();
  });

  it('says so when a space’s hours are not known', async () => {
    await opened(3);
    const spaces = within(screen.getByTestId('study-spaces'));

    expect(spaces.getByText('1층 라운지')).toBeOnTheScreen();
    expect(spaces.getByText('시간 정보 없음')).toBeOnTheScreen();
    expect(screen.getByText('걸음 15분 · 22:25까지 3시간')).toBeOnTheScreen();
  });
});

function pressed(): { openMenu: jest.Mock<void, [string]>; onMark: jest.Mock<void, [string, LatLng]>; press: OnMark } {
  const openMenu = jest.fn<void, [string]>();
  const onMark = jest.fn<void, [string, LatLng]>();
  const press = withMealMenu({ answer: { answer: STUDY_PLAN_ANSWER, plan: planAt(1), openMenu } }, onMark);
  return { openMenu, onMark, press };
}

const SOMEWHERE: LatLng = { latitude: 0, longitude: 0 };

// Partitions: the chosen place's mark of a study answer; another mark. Expected values: the place opened, or the press
// passed on.
describe("a press on a study answer's chosen place", () => {
  it('opens that place', () => {
    const { openMenu, onMark, press } = pressed();

    press('answer:pick', SOMEWHERE);

    expect(openMenu).toHaveBeenCalledWith(planAt(1).id);
    expect(onMark).not.toHaveBeenCalled();
  });

  it('passes another mark on', () => {
    const { openMenu, onMark, press } = pressed();

    press('answer:candidate:1', SOMEWHERE);

    expect(onMark).toHaveBeenCalled();
    expect(openMenu).not.toHaveBeenCalled();
  });
});
