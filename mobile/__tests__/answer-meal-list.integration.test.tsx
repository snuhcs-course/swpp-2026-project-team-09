/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import type { AnswerReply } from '@/api/assistant-types';
import { MEAL_ANSWER_MENUS_REPLY } from '@/api/mock/data/meal-answer-menus';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap, card } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { pass } from './support/app';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { sockets } from './support/fake-socket';

// A meal answer's card (boards E1, E3, E4): docked, the Assistant's sentence with no chips; raised, every candidate as a
// row, the nearest first, with the kinds over them; a press on a row chooses that place and opens its menu.

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

const SENTENCE = '12:15에 302동식당에서 민수와 만나 먹어요.';

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
  return within(screen.getByTestId('meal-list'));
}

// The stored answer with its first four Plans, so that four candidates have menus.
function fourOf(reply: typeof MEAL_ANSWER_MENUS_REPLY): typeof MEAL_ANSWER_MENUS_REPLY {
  const answer: AnswerReply = { ...reply.answer, plans: reply.answer.plans.slice(0, 4) };
  return { ...reply, answer };
}

type User = Awaited<ReturnType<typeof askOnMap>>;

async function raise(user: User): Promise<void> {
  await user.press(screen.getByTestId('dock-line'));
}

// Partitions: docked; raised by the sentence.
describe('a meal answer with four candidates', () => {
  it('docks with the sentence alone: no kind chips and no 메뉴 보기', async () => {
    await askOnMap(server, fourOf(MEAL_ANSWER_MENUS_REPLY));

    expect(screen.getByTestId('dock-line-words')).toHaveTextContent(SENTENCE);
    expect(screen.queryByRole('button', { name: '메뉴 보기' })).toBeNull();
    expect(screen.queryByTestId('kind-chips')).toBeNull();
  });

  it('lists every candidate when raised, the least walking first, the chosen one marked, under the kinds', async () => {
    const user = await askOnMap(server, fourOf(MEAL_ANSWER_MENUS_REPLY));

    await raise(user);

    const rows = ['1', '2', '3', '4'].map((number) => list().getByTestId(`meal-row-${number}`));
    expect(rows.map((row) => String(row.props.accessibilityLabel).split(' · ')[0])).toEqual([
      '1 302동식당',
      '2 301동식당',
      '3 학생회관식당',
      '4 3식당',
    ]);
    const labels = list()
      .getAllByRole('button', { name: /^\d /u })
      .map((row) => String(row.props.accessibilityLabel));
    expect(labels).toHaveLength(4);
    const walks = labels.map((label) => Number(/걸음 (\d+)분/u.exec(label)?.[1] ?? Number.NaN));
    expect(walks.every((walk) => !Number.isNaN(walk))).toBe(true);
    expect(walks).toEqual(walks.toSorted((one, other) => one - other));
    expect(String(rows[0]?.props.accessibilityLabel)).toMatch(/^1 302동식당 · 걸음 \d+분 · .* · 고른 곳$/u);
    expect(within(screen.getByTestId('kind-chips')).getByRole('button', { name: /^전체 4곳$/u })).toBeSelected();
  });
});

// Partitions: a row pressed; ‹ 목록 pressed.
describe('a row of the list pressed', () => {
  it('chooses that place and opens its menu, and ‹ 4곳 목록 returns to the list', async () => {
    const user = await askOnMap(server, fourOf(MEAL_ANSWER_MENUS_REPLY));
    await raise(user);

    await user.press(list().getByTestId('meal-row-2'));

    const menu = within(screen.getByTestId('meal-menu'));
    expect(menu.getByText('301동식당')).toBeVisible();
    expect(menu.getByText(/^12:18 도착/u)).toBeVisible();
    expect(screen.getByRole('button', { name: /^301동식당 · 12:18 /u })).toBeOnTheScreen();

    await user.press(menu.getByRole('button', { name: '‹ 4곳 목록' }));
    expect(screen.queryByTestId('meal-menu')).toBeNull();
    expect(String(list().getByTestId('meal-row-2').props.accessibilityLabel)).toMatch(/ · 고른 곳$/u);
  });
});

const HELD_MS = 3000;

// Partitions: a row pressed while the Plan on screen is being sent (review of PR 440).
describe('the list while the Plan is sent', () => {
  it('chooses nothing while "만들고 초대 보내기" is on its way, and the made card shows for the Plan sent', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST, afterMs: HELD_MS });
    const user = await askOnMap(server, fourOf(MEAL_ANSWER_MENUS_REPLY));
    await raise(user);

    await user.press(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '만들고 초대 보내기' }));
    const third = list().getByTestId('meal-row-3');
    expect(third).toBeDisabled();
    await user.press(third);
    await pass(HELD_MS);

    expect(screen.getByRole('button', { name: /^302동식당 · 12:15 /u })).toBeOnTheScreen();
    expect(card().getByText('김민수에게 점심 초대를 보냈어요')).toBeVisible();
  });
});
