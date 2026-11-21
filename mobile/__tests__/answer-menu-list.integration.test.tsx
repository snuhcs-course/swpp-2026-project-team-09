/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import type { AnswerReply } from '@/api/assistant-types';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_MENUS_REPLY } from '@/api/mock/data/meal-answer-menus';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { sockets } from './support/fake-socket';

// 메뉴 모두 보기 (P04 ticket 15, board 23): a meal answer's chip 메뉴 보기 opens every candidate's dishes and prices above the
// dock, in the map's order, the pick's group marked; a press on another group makes it the pick and folds the list.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('./support/fake-socket'));

const CHIP = '메뉴 보기';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function list(): ReturnType<typeof within> {
  return within(screen.getByTestId('menu-list'));
}

// The stored answer with its first four Plans, so that four candidates have menus.
function fourOf(reply: typeof MEAL_ANSWER_MENUS_REPLY): typeof MEAL_ANSWER_MENUS_REPLY {
  const answer: AnswerReply = { ...reply.answer, plans: reply.answer.plans.slice(0, 4) };
  return { ...reply, answer };
}

// Partitions: four candidates with menus; the chip pressed, a group pressed, 접기; a dish without a price.
describe('메뉴 모두 보기 of a meal answer with four candidates and their menus', () => {
  it('opens four groups in the map order, the pick marked, each dish with its price', async () => {
    const user = await askOnMap(server, fourOf(MEAL_ANSWER_MENUS_REPLY));

    await user.press(screen.getByRole('button', { name: CHIP }));

    expect(list().getByText('메뉴 모두 보기 · 화 점심')).toBeVisible();
    const groups = ['1 302동식당', '2 301동식당', '3 학생회관식당', '4 3식당'].map((start) =>
      list().getByRole('button', { name: new RegExp(`^${start} · `, 'u') }),
    );
    expect(groups.map((group) => String(group.props.accessibilityLabel))).toEqual([
      '1 302동식당 · 12:15 도착 · 고른 곳',
      '2 301동식당 · 12:18 도착',
      '3 학생회관식당 · 12:33 도착',
      '4 3식당 · 12:31 도착',
    ]);
    const first = within(groups[0] ?? screen.getByTestId('menu-list'));
    expect(first.getByText('뼈없는감자탕')).toBeVisible();
    expect(first.getByText('6,000원')).toBeVisible();
    expect(first.getByText('고른 곳')).toBeVisible();
  });

  it('shows a dish without a price by its name alone', async () => {
    const user = await askOnMap(server, fourOf(MEAL_ANSWER_MENUS_REPLY));

    await user.press(screen.getByRole('button', { name: CHIP }));

    const second = within(list().getByRole('button', { name: /^2 301동식당 · /u }));
    expect(second.getByText('오므라이스')).toBeVisible();
    expect(second.getAllByText(/원$/u)).toHaveLength(4);
  });
});

// Partitions: a group pressed, 접기, and the chip pressed again.
describe('메뉴 모두 보기 pressed', () => {
  it('makes candidate 2 the pick on a press on its group, and folds the list', async () => {
    const user = await askOnMap(server, fourOf(MEAL_ANSWER_MENUS_REPLY));
    await user.press(screen.getByRole('button', { name: CHIP }));

    await user.press(list().getByRole('button', { name: /^2 301동식당 · /u }));

    expect(screen.queryByTestId('menu-list')).toBeNull();
    expect(screen.getByRole('button', { name: /^301동식당 · 12:18 /u })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^후보 1 · 302동식당 · 12:15/u })).toBeOnTheScreen();
  });

  it('folds by 접기 and by the chip again', async () => {
    const user = await askOnMap(server, fourOf(MEAL_ANSWER_MENUS_REPLY));
    await user.press(screen.getByRole('button', { name: CHIP }));

    await user.press(list().getByRole('button', { name: '접기' }));
    expect(screen.queryByTestId('menu-list')).toBeNull();

    await user.press(screen.getByRole('button', { name: CHIP }));
    expect(screen.getByTestId('menu-list')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: CHIP }));
    expect(screen.queryByTestId('menu-list')).toBeNull();
  });
});

describe('a meal answer without menus', () => {
  it('has no 메뉴 모두 보기', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    expect(screen.queryByRole('button', { name: CHIP })).toBeNull();
  });
});
