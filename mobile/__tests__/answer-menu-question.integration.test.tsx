/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { pass, screen } from './support/app';
import { card } from './support/answer-map';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';

// A menu question's answer (P04 ticket 72): "예술계 메뉴가 뭐야?" was answered with the model's paragraph of the menu,
// a pill "83동에서" with "근거 ›", two bold lines, and under 근거 the whole menu again. It is now the view of that
// Restaurant as the meal answer's list opens it, over the mocks: "오늘 301동식당 메뉴 뭐야?" opened at 301동식당
// (`menu-answer.ts`), and "학생회관식당 메뉴 뭐야?" of a holiday whose lunch its menu closes.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

jest.setTimeout(150000);

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function ask(words: string): Promise<void> {
  const user = await openMain();
  await pass(500);
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(3000);
}

// Partitions: a Restaurant that can be done, and one its menu closes. Expected values: the mocks' answers.
describe('a menu question', () => {
  it('opens the Restaurant as the meal list does: its head, its menu, the way back, and no pill, lines, or 근거', async () => {
    await ask('오늘 301동식당 메뉴 뭐야?');

    const menu = within(screen.getByTestId('meal-menu'));
    expect(menu.getByText('301동식당')).toBeOnTheScreen();
    expect(menu.getByText('‹ 1곳 목록')).toBeOnTheScreen();
    expect(menu.getByText(/도착/u)).toBeOnTheScreen();
    expect(menu.getByText('부대짬뽕&군만두')).toBeOnTheScreen();
    expect(card().queryByText('근거')).toBeNull();
    expect(card().queryByText('301동에서')).toBeNull();
    expect(card().queryByText('아래에서 확인해 보세요.')).toBeNull();
    expect(screen.queryByTestId('lookup-card')).toBeNull();
  });

  it('shows the menu of a Restaurant its menu closes, why in its head, and no button', async () => {
    await ask('학생회관식당 메뉴 뭐야?');

    const view = within(screen.getByTestId('menu-view'));
    expect(view.getByText('학생회관식당')).toBeOnTheScreen();
    expect(view.getByText('10/3(토) 휴점')).toBeOnTheScreen();
    expect(card().getByText('학생회관식당은 10/3(토) 점심에 휴점이에요.')).toBeOnTheScreen();
    expect(card().queryByText('근거')).toBeNull();
    expect(screen.queryByTestId('meal-menu-back')).toBeNull();
    expect(screen.queryByRole('button', { name: '길 안내' })).toBeNull();
  });
});
